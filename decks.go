package main

import (
    "database/sql"
    "errors"
    "fmt"
    "net/http"
    "regexp"
    "strconv"
    "strings"

    // 3rd-party
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

/* variables */

// errors
var ErrDeckNoSuchDeck = errors.New("decks: no such deck of given id")
var ErrDeckNoChildren = errors.New("decks: deck has no children")
var ErrQueryDeckNotPatched = errors.New("decks: deck not patched")
var ErrDeckHasNoParent = errors.New("decks: deck has no parent")
var ErrDeckNoAncestors = errors.New("decks: deck has no ancestors")

/* types */

type DeckProps struct {
    Name        string
    Description string
}

type DeckRow struct {
    ID          uint `db:"deck_id"`
    Name        string
    Description string
}

type DeckRelationship struct {
    Ancestor   uint
    Descendent uint
    Depth      uint
}

type DeckPOSTRequest struct {
    Name        string `json:"name" binding:"required"`
    Description string `json:"description"`
    Parent      uint   `json:"parent" binding:"required,min=1"`
}

/* REST Handlers */

// GET /decks/:id
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func DeckGET(db *sqlx.DB, ctx *gin.Context) {

    var err error

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    var fetchedDeckRow *DeckRow

    // fetch deck row from the db

    if deckIDString == "root" {
        fetchedDeckRow, err = GetRootDeck(db)

        if err != nil {
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve root",
            })
            ctx.Error(err)
            return
        }
    } else {
        _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
        if err != nil {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "given id is invalid",
            })
            ctx.Error(err)
            return
        }

        fetchedDeckRow, err = GetDeck(db, uint(_deckID))
        switch {
        case err == ErrDeckNoSuchDeck:
            ctx.JSON(http.StatusNotFound, gin.H{
                "status":           http.StatusNotFound,
                "developerMessage": err.Error(),
                "userMessage":      "cannot find deck by id",
            })
            ctx.Error(err)
            return
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve deck",
            })
            ctx.Error(err)
            return
        }
    }

    // fetch children
    var children []uint
    children, err = GetDeckChildren(db, fetchedDeckRow.ID)
    switch {
    case err == ErrDeckNoChildren:
        children = []uint{}
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck children",
        })
        ctx.Error(err)
        return
    }

    // fetch parent
    var parentID uint
    var hasParent bool = true
    parentID, err = GetDeckParent(db, fetchedDeckRow.ID)
    switch {
    case err == ErrDeckHasNoParent:
        parentID = 0
        hasParent = false
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve parent deck",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusOK, DeckResponse(&gin.H{
        "id":          fetchedDeckRow.ID,
        "name":        fetchedDeckRow.Name,
        "description": fetchedDeckRow.Description,
        "children":    children,
        "parent":      parentID,
        "hasParent":   hasParent,
    }))
}

func DeckGETMany(db *sqlx.DB, ctx *gin.Context) {

    var decksRawString string = ctx.Query("decks")

    if len(decksRawString) <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "no decks list given",
            "userMessage":      "no decks list given",
        })
        return
    }

    queryMatcher, err := regexp.Compile("^[1-9]\\d*(,[1-9]\\d*)*$")

    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "unable to parse decks list",
        })
        ctx.Error(err)
        return
    }

    if !queryMatcher.MatchString(decksRawString) {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "invalid decks list",
            "userMessage":      "invalid decks list",
        })
        return
    }

    var decks []string = strings.Split(decksRawString, ",")

    var resolvedDecks []gin.H = make([]gin.H, 0, len(decks))

    for _, deckIDString := range decks {

        __deckID, err := strconv.ParseUint(deckIDString, 10, 32)
        var deckID uint = uint(__deckID)

        if err != nil {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "unable to parse decks list",
            })
            ctx.Error(err)
            return
        }

        var fetchedDeckRow *DeckRow
        fetchedDeckRow, err = GetDeck(db, deckID)

        switch {
        case err == ErrDeckNoSuchDeck:
            ctx.JSON(http.StatusNotFound, gin.H{
                "status":           http.StatusNotFound,
                "developerMessage": err.Error(),
                "userMessage":      "cannot find deck by id",
            })
            ctx.Error(err)
            return
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve deck",
            })
            ctx.Error(err)
            return
        }

        // fetch children
        var children []uint
        children, err = GetDeckChildren(db, deckID)
        switch {
        case err == ErrDeckNoChildren:
            children = []uint{}
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve deck children",
            })
            ctx.Error(err)
            return
        }

        // fetch parent
        var parentID uint
        var hasParent bool = true
        parentID, err = GetDeckParent(db, deckID)
        switch {
        case err == ErrDeckHasNoParent:
            parentID = 0
            hasParent = false
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve parent deck",
            })
            ctx.Error(err)
            return
        }

        var dr gin.H = DeckResponse(&gin.H{
            "id":          fetchedDeckRow.ID,
            "name":        fetchedDeckRow.Name,
            "description": fetchedDeckRow.Description,
            "children":    children,
            "parent":      parentID,
            "hasParent":   hasParent,
        })

        resolvedDecks = append(resolvedDecks, dr)
    }

    ctx.JSON(http.StatusOK, resolvedDecks)
}

// GET /decks/:id/children
//
// shortcut to doing N GET /decks/:id requests for fetching children of a deck
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func DeckChildrenGET(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    // verify deck id exists
    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var deckID uint = uint(_deckID)

    _, err = GetDeck(db, deckID)

    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find deck by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck",
        })
        ctx.Error(err)
        return
    }

    // fetch children
    var childrenIDs []uint
    childrenIDs, err = GetDeckChildren(db, deckID)
    switch {
    case err == ErrDeckNoChildren:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "deck has no children",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck children",
        })
        ctx.Error(err)
        return
    }

    var children []gin.H = make([]gin.H, 0, len(childrenIDs))
    for _, childDeckID := range childrenIDs {

        var row *DeckRow
        row, err = GetDeck(db, childDeckID)

        // fetch children
        var _childrenIDs []uint
        _childrenIDs, err = GetDeckChildren(db, childDeckID)
        switch {
        case err == ErrDeckNoChildren:
            _childrenIDs = []uint{}
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve deck children",
            })
            ctx.Error(err)
            return
        }

        var response gin.H = DeckResponse(&gin.H{
            "id":          childDeckID,
            "name":        row.Name,
            "description": row.Description,
            "children":    _childrenIDs,
            "parent":      deckID,
            "hasParent":   true,
        })

        children = append(children, response)
    }

    ctx.JSON(http.StatusOK, children)
}

// GET /decks/:id/ancestors
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func DeckAncestorsGET(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    // verify deck id exists
    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var deckID uint = uint(_deckID)

    _, err = GetDeck(db, deckID)

    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find deck by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck",
        })
        ctx.Error(err)
        return
    }

    var ancestorsIDs []uint
    ancestorsIDs, err = GetDeckAncestors(db, deckID)

    switch {
    case err == ErrDeckNoAncestors:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "deck has no ancestors",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck's ancestors",
        })
        ctx.Error(err)
        return
    }

    var ancestors []gin.H = make([]gin.H, 0, len(ancestorsIDs))
    for idx, ancestorDeckID := range ancestorsIDs {

        var row *DeckRow
        row, err = GetDeck(db, ancestorDeckID)

        // fetch children
        var _childrenIDs []uint
        _childrenIDs, err = GetDeckChildren(db, ancestorDeckID)
        switch {
        case err == ErrDeckNoChildren:
            _childrenIDs = []uint{}
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve deck children",
            })
            ctx.Error(err)
            return
        }

        var hasParent bool
        var parent uint
        if (idx - 1) >= 0 {
            hasParent = true
            parent = ancestorsIDs[idx-1]
        } else {
            hasParent = false
            parent = 0
        }

        var response gin.H = DeckResponse(&gin.H{
            "id":          ancestorDeckID,
            "name":        row.Name,
            "description": row.Description,
            "children":    _childrenIDs,
            "parent":      parent,
            "hasParent":   hasParent,
        })

        ancestors = append(ancestors, response)
    }

    ctx.JSON(http.StatusOK, ancestors)
}

// GET /decks/:id/cards
//
// Path params:
// id: a unique, positive integer that is the identifier of the assocoated deck
//
// Query params:
// page: integer starting from 1 (default: 1)
func DeckCardsGET(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var deckID uint = uint(_deckID)

    // parse page query
    var pageQueryString string = ctx.DefaultQuery("page", "1")
    _page, err := strconv.ParseUint(pageQueryString, 10, 32)
    if err != nil || _page <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given page query param is invalid",
        })
        ctx.Error(err)
        return
    }
    var page uint = uint(_page)

    // parse per_page query
    var perpageQueryString string = ctx.DefaultQuery("per_page", "25")
    _per_page, err := strconv.ParseUint(perpageQueryString, 10, 32)
    if err != nil || _per_page <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given per_page query param is invalid",
        })
        ctx.Error(err)
        return
    }
    var per_page uint = uint(_per_page)

    // parse sort order
    var orderQueryString string = strings.ToUpper(ctx.DefaultQuery("order", "DESC"))

    switch {
    case orderQueryString == "DESC":
    case orderQueryString == "ASC":
    default:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "invalid order query",
            "userMessage":      "invalid order query",
        })
        return
    }

    // parse sort metric query
    var sortQueryString string = ctx.DefaultQuery("sort", "reviewed_at")

    var query PipeInput
    switch {
    case sortQueryString == "created_at":
        query = FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY(orderQueryString)
    case sortQueryString == "updated_at":
        query = FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY(orderQueryString)
    case sortQueryString == "title":
        query = FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY(orderQueryString)
    case sortQueryString == "reviewed_at":
        query = FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY(orderQueryString)
    case sortQueryString == "times_reviewed":
        query = FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY(orderQueryString)
    default:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "invalid sort query",
            "userMessage":      "invalid sort query",
        })
        return
    }

    // verify deck id exists
    _, err = GetDeck(db, deckID)

    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find deck by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck",
        })
        ctx.Error(err)
        return
    }

    // fetch cards
    var cards *([]CardRow)
    cards, err = CardsByDeck(db, query, deckID, page, per_page)

    switch {
    case err == ErrCardNoCardsByDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "deck has no cards",
        })
        ctx.Error(err)
        return
    case err == ErrCardPageOutOfBounds:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "page is out of bound",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve cards for deck",
        })
        ctx.Error(err)
        return
    }

    var response []gin.H = make([]gin.H, 0, len(*cards))

    for _, cr := range *cards {

        // fetch card score
        var fetchedCardScore *CardScoreRow
        fetchedCardScore, err = GetCardScoreRecord(db, cr.ID)
        if err != nil {
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve card score record",
            })
            ctx.Error(err)
            return
        }

        var fetchedStashes []uint
        fetchedStashes, err = StashesByCard(db, cr.ID)
        if err != nil {
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to retrieve card stashes",
            })
            ctx.Error(err)
            return
        }

        var cardrow gin.H = CardRowToResponse(db, &cr)
        var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

        foo := MergeResponses(
            &cardrow,
            &gin.H{"review": cardscore},
            &gin.H{"stashes": fetchedStashes},
        )
        response = append(response, foo)
    }

    ctx.JSON(http.StatusOK, response)
}

// GET /decks/:id/cards/count
//
// Path params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func DeckCardsCountGET(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var deckID uint = uint(_deckID)

    // verify deck id exists
    _, err = GetDeck(db, deckID)

    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find deck by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck",
        })
        ctx.Error(err)
        return
    }

    // fetch card count
    var count uint
    count, err = CountCardsByDeck(db, deckID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve count of cards for given deck",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "total": count,
    })
}

// POST /decks
//
// Input:
// name: non-empty string that shall be the name of the new deck
// parent: a positive intger
func DeckPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse request
    var (
        err         error
        jsonRequest DeckPOSTRequest
    )

    err = ctx.BindJSON(&jsonRequest)
    if err != nil {

        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "bad JSON input",
        })
        ctx.Error(err)
        return
    }

    // ensure stash name is valid
    if len(strings.TrimSpace(jsonRequest.Name)) <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "given deck name must be non-empty",
            "userMessage":      "given deck name must be non-empty",
        })
        return
    }

    // fetch parent
    var parentDeckRow *DeckRow
    parentDeckRow, err = GetDeck(db, jsonRequest.Parent)
    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "canot find deck with given parent id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve parent deck",
        })
        ctx.Error(err)
        return
    }

    // create deck
    var newDeckRow *DeckRow

    newDeckRow, err = CreateDeck(db, &DeckProps{
        Name:        jsonRequest.Name,
        Description: jsonRequest.Description,
    })
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to create new deck",
        })
        ctx.Error(err)
    }

    // set new deck to be a child of parent
    err = CreateDeckRelationship(db, parentDeckRow.ID, newDeckRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to create new deck as a child",
        })
        ctx.Error(err)

        // TODO: transaction rollback
    }

    ctx.JSON(http.StatusCreated, DeckResponse(&gin.H{
        "id":          newDeckRow.ID,
        "name":        newDeckRow.Name,
        "description": newDeckRow.Description,
        "parent":      parentDeckRow.ID,
        "hasParent":   true,
    }))
}

// DELETE /decks/:id
//
// Delete deck by id
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func DeckDELETE(db *sqlx.DB, ctx *gin.Context) {

    var err error

    // parse id param
    var deckIDString string = strings.ToLower(ctx.Param("id"))

    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    var deckID uint = uint(_deckID)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }

    // ensure deck exists

    _, err = GetDeck(db, uint(_deckID))
    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find deck with given id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck",
        })
        ctx.Error(err)
        return
    }

    // delete deck
    err = DeleteDeck(db, deckID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to delete deck",
        })
        ctx.Error(err)
        return
    }

    // ensure deck is deleted

    _, err = GetDeck(db, deckID)
    switch {
    case err == ErrDeckNoSuchDeck:
        // success
        ctx.Writer.WriteHeader(http.StatusNoContent)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to check if deck is deleted",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusInternalServerError, gin.H{
        "status":           http.StatusInternalServerError,
        "developerMessage": err.Error(),
        "userMessage":      "unable to delete deck",
    })
}

// PATCH /decks/:id
//
// Input:
// name: non-empty string that shall be the new name of the deck
//
// NOTE: PATCH operation on root node is allowed
func DeckPATCH(db *sqlx.DB, ctx *gin.Context) {

    var (
        err error
    )

    // parse id
    var deckIDString string = strings.ToLower(ctx.Param("id"))
    _deckID, err := strconv.ParseUint(deckIDString, 10, 32)
    var deckID uint = uint(_deckID)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }

    // parse request body
    var patch *StringMap = &StringMap{}
    err = ctx.BindJSON(patch)
    if err != nil {

        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "bad JSON input",
        })
        ctx.Error(err)
        return
    }
    if len(*patch) <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "no JSON input",
            "userMessage":      "no JSON input",
        })
        return
    }

    // TODO: validate patch
    // TODO: ensure name, if given, is non-empty string

    var (
        patchResponse  gin.H    = gin.H{}
        fetchedDeckRow *DeckRow = nil
    )

    // check requested deck exists and fetch it

    fetchedDeckRow, err = GetDeck(db, deckID)
    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "unable to find deck with given id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to fetch deck",
        })
        ctx.Error(err)
        return
    }

    var (
        parentID  uint
        hasParent bool = true

        // control flow flags
        movedSubtree bool = false
        skipPatch    bool = false
    )

    // fetch parent deck

    parentID, err = GetDeckParent(db, deckID)
    switch {
    case err == ErrDeckHasNoParent:
        parentID = 0
        hasParent = false
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve parent deck",
        })
        ctx.Error(err)
        return
    }

    // case: splice deck subtree into a new deck
    if _, hasParentKey := (*patch)["parent"]; hasParentKey == true {

        // TODO: do this earlier for early bail
        // validate parent param
        var maybeParentID uint
        maybeParentID, err = (func() (uint, error) {
            switch _parentID := (*patch)["parent"].(type) {
            // note that according to docs: http://golang.org/pkg/encoding/json/#Unmarshal
            // JSON numbers are converted to float64
            case float64:
                if _parentID > 0 {
                    return uint(_parentID), nil
                }
            }
            return 0, errors.New("target parent is invalid")
        }())

        if err != nil {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      err.Error(),
            })
            ctx.Error(err)
            return
        }

        // cannot move deck to be parent of itself
        if deckID == maybeParentID {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": "cannot move deck to be parent of itself",
                "userMessage":      "cannot move deck to be parent of itself",
            })
            return
        }

        // cannot move deck to the same parent
        if parentID == maybeParentID {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": "cannot move deck to the same parent",
                "userMessage":      "cannot move deck to the same parent",
            })
            return
        }
        parentID = maybeParentID

        // validate target parent exists
        _, err = GetDeck(db, parentID)
        switch {
        case err == ErrDeckNoSuchDeck:
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "given parent id is invalid",
            })
            ctx.Error(err)
            return
        case err != nil:
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to fetch deck",
            })
            ctx.Error(err)
            return
        }

        // move deck
        err = MoveDeck(db, deckID, parentID)
        if err != nil {
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to move deck",
            })
            ctx.Error(err)
            return
        }

        // control flow
        movedSubtree = true
        if len(*patch) <= 1 {
            skipPatch = true
        }

    }

    // optimistically populate patchResponse
    patchResponse["id"] = deckID

    // name
    if _, has := (*patch)["name"]; has {
        // TODO: no need to fetch requested deck
        patchResponse["name"] = (*patch)["name"]
    } else {
        patchResponse["name"] = fetchedDeckRow.Name
    }

    // description
    if _, has := (*patch)["description"]; has {
        // TODO: no need to fetch requested deck
        patchResponse["description"] = (*patch)["description"]
    } else {
        patchResponse["description"] = fetchedDeckRow.Description
    }

    // parent
    patchResponse["parent"] = parentID
    patchResponse["hasParent"] = hasParent

    // generate SQL to patch deck
    if !skipPatch {
        var (
            query string
            args  []interface{}
        )

        query, args, err = QueryApply(UPDATE_DECK_QUERY, &StringMap{"deck_id": deckID}, patch)
        if err != nil {
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to generate patch deck SQL",
            })
            ctx.Error(err)
            return
        }

        var res sql.Result
        res, err = db.Exec(query, args...)
        if err != nil {
            // TODO: transaction rollback
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to patch deck",
            })
            ctx.Error(err)
            return
        }

        num, err := res.RowsAffected()
        if err != nil {
            // TODO: transaction rollback
            ctx.JSON(http.StatusInternalServerError, gin.H{
                "status":           http.StatusInternalServerError,
                "developerMessage": err.Error(),
                "userMessage":      "unable to patch deck",
            })
            ctx.Error(err)
            return
        }

        if num <= 0 && !movedSubtree {
            // TODO: transaction rollback
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": "given JSON is invalid",
                "userMessage":      "given JSON is invalid",
            })
            return
        }
    }

    // fetch children
    var children []uint
    children, err = GetDeckChildren(db, deckID)
    switch {
    case err == ErrDeckNoChildren:
        children = []uint{}
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve deck children",
        })
        ctx.Error(err)
        return
    }
    patchResponse["children"] = children

    ctx.JSON(http.StatusOK, DeckResponse(&patchResponse))
}

/* helpers */

func DeckResponse(overrides *gin.H) gin.H {
    defaultResponse := &gin.H{
        "name":        "",
        "description": "",
        "id":          0,
        "children":    []uint{},
        "parent":      0,
        "hasParent":   false,
    }

    return MergeResponse(defaultResponse, overrides)
}

func GetDeck(db *sqlx.DB, deckID uint) (*DeckRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(FETCH_DECK_QUERY, &StringMap{"deck_id": deckID})
    if err != nil {
        return nil, err
    }

    var fetchedDeck *DeckRow = &DeckRow{}

    err = db.QueryRowx(query, args...).StructScan(fetchedDeck)

    switch {
    case err == sql.ErrNoRows:
        return nil, ErrDeckNoSuchDeck
    case err != nil:
        return nil, err
    default:
        return fetchedDeck, nil
    }
}

func CreateDeck(db *sqlx.DB, props *DeckProps) (*DeckRow, error) {

    // TODO: validation on props

    var (
        err   error
        res   sql.Result
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(CREATE_NEW_DECK_QUERY, &StringMap{
        "name":        props.Name,
        "description": props.Description,
    })
    if err != nil {
        return nil, err
    }

    res, err = db.Exec(query, args...)
    if err != nil {
        return nil, err
    }

    insertID, err := res.LastInsertId()
    if err != nil {
        return nil, err
    }

    return GetDeck(db, uint(insertID))
}

func GetRootDeck(db *sqlx.DB) (*DeckRow, error) {

    var (
        rootConfig *Config
        err        error
    )

    setNewRoot := func() (*DeckRow, error) {

        var err error

        // create a new root deck
        var rootDeck *DeckRow
        rootDeck, err = CreateDeck(db, &DeckProps{
            Name:        "Library",
            Description: "",
        })

        if err != nil {
            return nil, err
        }

        // set new root deck as new config value
        var rootIDString string = fmt.Sprintf("%d", rootDeck.ID)
        err = SetConfig(db, CONFIG_ROOT, rootIDString)

        // TODO: needs transaction!

        if err != nil {
            // TODO: rollback deck creation
            return nil, err
        }

        return rootDeck, nil
    }

    // fetch root config (if any)
    rootConfig, err = GetConfig(db, CONFIG_ROOT)
    if err != nil {
        if err != ErrConfigNoSuchSetting {
            return nil, err
        }

        // config doesn't exist

        // create new root and set as default
        return setNewRoot()
    }

    // root config found; parse setting

    _rootID, err := strconv.ParseUint(rootConfig.Value, 10, 32)
    var rootID uint = uint(_rootID)

    if err != nil {
        return nil, err
    }

    // ensure root deck exists
    var rootDeckRow *DeckRow
    rootDeckRow, err = GetDeck(db, rootID)

    switch {
    case err == ErrDeckNoSuchDeck:
        // create new root and set as default
        return setNewRoot()
    case err != nil:
        return nil, err
    default:
        return rootDeckRow, nil
    }
}

func DeleteDeck(db *sqlx.DB, deckID uint) error {

    var (
        err      error
        query    string
        args     []interface{}
        children []uint
    )

    // delete children first
    children, err = GetDeckChildren(db, deckID)
    for _, childID := range children {
        err = DeleteDeck(db, childID)
        if err != nil {
            return err
        }
    }

    query, args, err = QueryApply(DELETE_DECK_QUERY, &StringMap{"deck_id": deckID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func GetDeckChildren(db *sqlx.DB, parentID uint) ([]uint, error) {

    var (
        err      error
        query    string
        rows     *sqlx.Rows
        args     []interface{}
        dr       DeckRelationship = DeckRelationship{}
        children []uint           = []uint{}
    )

    query, args, err = QueryApply(DECK_CHILDREN_QUERY, &StringMap{"parent": parentID})
    if err != nil {
        return nil, err
    }

    rows, err = db.Queryx(query, args...)
    for rows.Next() {
        err := rows.StructScan(&dr)
        if err != nil {
            return nil, err
        }

        children = append(children, dr.Descendent)
    }

    if len(children) <= 0 {
        return nil, ErrDeckNoChildren
    }

    return children, nil
}

func GetDeckParent(db *sqlx.DB, childID uint) (uint, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(DECK_PARENT_QUERY, &StringMap{"child": childID})
    if err != nil {
        return 0, err
    }

    var dr *DeckRelationship = &DeckRelationship{}

    err = db.QueryRowx(query, args...).StructScan(dr)

    switch {
    case err == sql.ErrNoRows:
        return 0, ErrDeckHasNoParent
    case err != nil:
        return 0, err
    default:
        return dr.Ancestor, nil
    }
}

// fetch ancestors from farthest to nearest
func GetDeckAncestors(db *sqlx.DB, childID uint) ([]uint, error) {

    var (
        err       error
        query     string
        rows      *sqlx.Rows
        args      []interface{}
        dr        DeckRelationship = DeckRelationship{}
        ancestors []uint           = []uint{}
        empty     []uint           = []uint{}
    )

    query, args, err = QueryApply(DECK_ANCESTORS_QUERY, &StringMap{"child": childID})
    if err != nil {
        return empty, err
    }

    rows, err = db.Queryx(query, args...)
    for rows.Next() {
        err := rows.StructScan(&dr)
        if err != nil {
            return empty, err
        }

        ancestors = append(ancestors, dr.Ancestor)
    }

    if len(ancestors) <= 0 {
        return empty, ErrDeckNoAncestors
    }

    return ancestors, nil
}

func CreateDeckRelationship(db *sqlx.DB, parent uint, child uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(ASSOCIATE_DECK_AS_CHILD_QUERY, &StringMap{"parent": parent, "child": child})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func MoveDeck(db *sqlx.DB, child uint, newParent uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    // TODO: run these queries in a transaction
    // db.Beginx()

    // delete subtree connections

    query, args, err = QueryApply(SPLICE_DECK_SUBTREE_DELETE_QUERY, &StringMap{"child": child})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    // add new subtree connections

    query, args, err = QueryApply(SPLICE_DECK_SUBTREE_ADD_QUERY, &StringMap{"child": child, "parent": newParent})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func DeckHasDescendent(db *sqlx.DB, parentID uint, childID uint) (bool, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(TEST_LINEAGE_QUERY, &StringMap{
        "parent":     parentID,
        "descendent": childID,
    })
    if err != nil {
        return false, err
    }

    var count int
    err = db.QueryRowx(query, args...).Scan(&count)

    if err != nil {
        return false, err
    }

    return (count > 0), nil
}
