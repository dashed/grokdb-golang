package main

import (
    "database/sql"
    "errors"
    "fmt"
    "net/http"
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

/* types */

type DeckProps struct {
    Name string
}

type DeckRow struct {
    ID   uint `db:"deck_id"`
    Name string
}

type DeckRelationship struct {
    Ancestor   uint
    Descendent uint
    Depth      uint
}

type DeckPOSTRequest struct {
    Name   string `json:"name" binding:"required"`
    Parent uint   `json:"parent" binding:"required,min=1"`
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
        "id":        fetchedDeckRow.ID,
        "name":      fetchedDeckRow.Name,
        "children":  children,
        "parent":    parentID,
        "hasParent": hasParent,
    }))
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
        Name: jsonRequest.Name,
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
        "id":        newDeckRow.ID,
        "name":      newDeckRow.Name,
        "parent":    parentDeckRow.ID,
        "hasParent": true,
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

    _, err = GetDeck(db, uint(_deckID))
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
// name: non-empty string that shall be the name of the new deck
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
    }

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

func DeckResponse(overrides *gin.H) *gin.H {
    defaultResponse := &gin.H{
        "name":      "",
        "id":        0,
        "children":  []uint{},
        "parent":    0,
        "hasParent": false,
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

    query, args, err = QueryApply(CREATE_NEW_DECK_QUERY, &StringMap{"name": props.Name})
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

    ret := &DeckRow{
        ID:   uint(insertID),
        Name: props.Name,
    }

    return ret, nil

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
            Name: "root_deck",
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
