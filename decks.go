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

/* types */

type DeckProps struct {
    Name string
}

type DeckRow struct {
    ID   uint `db:"deck_id"`
    Name string
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
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "given id is invalid",
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

    ctx.JSON(http.StatusOK, DeckResponse(&gin.H{
        "id":   fetchedDeckRow.ID,
        "name": fetchedDeckRow.Name,
        // "children":  children,
        // "parent":    parent,
        // "hasParent": hasParent,
    }))

}

// POST /decks
//
// Input:
// name: non-empty string that shall be the name of the new deck
// parent: a positive intger
func DeckPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse request
    var err error

    var jsonRequest DeckPOSTRequest
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

    ctx.JSON(http.StatusOK, DeckResponse(&gin.H{
        "id":   newDeckRow.ID,
        "name": newDeckRow.Name,
        // "children":  children,
        // "parent":    parent,
        // "hasParent": hasParent,
    }))
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
