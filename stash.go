package main

import (
    "database/sql"
    "errors"
    "net/http"
    "strconv"
    "strings"

    // 3rd-party
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

/* variables */
var ErrStashNoSuchStash = errors.New("stashes: no such stash of given id")

/* types */

type StashProps struct {
    Name        string
    Description string
}

type StashRow struct {
    ID          uint `db:"stash_id"`
    Name        string
    Description string
    CreatedAt   int64 `db:"created_at"`
    UpdatedAt   int64 `db:"updated_at"`
}

type StashPOSTRequest struct {
    Name        string `json:"name" binding:"required"`
    Description string `json:"description"`
}

/* REST Handlers */

func StashGET(db *sqlx.DB, ctx *gin.Context) {

    var err error

    // parse and validate id param
    var stashIDString string = strings.ToLower(ctx.Param("id"))

    _stashID, err := strconv.ParseUint(stashIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var stashID uint = uint(_stashID)

    // fetch stash row from the db

    var fetchedStashRow *StashRow
    fetchedStashRow, err = GetStash(db, stashID)
    switch {
    case err == ErrStashNoSuchStash:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find stash by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve stash",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusCreated, StashRowToResponse(fetchedStashRow))
}

func StashPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse request
    var (
        err         error
        jsonRequest StashPOSTRequest
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

    // create stash
    var newStashRow *StashRow

    newStashRow, err = CreateStash(db, &StashProps{
        Name:        jsonRequest.Name,
        Description: jsonRequest.Description,
    })
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to create new stash",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusCreated, StashRowToResponse(newStashRow))
}

/* helpers */

func StashResponse(overrides *gin.H) gin.H {
    defaultResponse := &gin.H{
        "id":          0,  // required
        "name":        "", // required
        "description": "",
        "created_at":  0,
        "updated_at":  0,
    }

    return MergeResponse(defaultResponse, overrides)
}

func StashRowToResponse(stashRow *StashRow) gin.H {
    return StashResponse(&gin.H{
        "id":          stashRow.ID,
        "name":        stashRow.Name,
        "description": stashRow.Description,
        "created_at":  stashRow.CreatedAt,
        "updated_at":  stashRow.UpdatedAt,
    })
}

func CreateStash(db *sqlx.DB, props *StashProps) (*StashRow, error) {

    var err error

    // validate stash props
    err = ValidateStashProps(props)
    if err != nil {
        return nil, err
    }

    var (
        res   sql.Result
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(CREATE_NEW_STASH_QUERY,
        &StringMap{
            "name":        props.Name,
            "description": props.Description,
        })
    if err != nil {
        return nil, err
    }

    // insert new card
    res, err = db.Exec(query, args...)
    if err != nil {
        return nil, err
    }

    insertID, err := res.LastInsertId()
    if err != nil {
        return nil, err
    }

    return GetStash(db, uint(insertID))
}

func GetStash(db *sqlx.DB, stashID uint) (*StashRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(FETCH_STASH_QUERY, &StringMap{"stash_id": stashID})
    if err != nil {
        return nil, err
    }

    var fetchedStash *StashRow = &StashRow{}

    err = db.QueryRowx(query, args...).StructScan(fetchedStash)

    switch {
    case err == sql.ErrNoRows:
        return nil, ErrStashNoSuchStash
    case err != nil:
        return nil, err
    default:
        return fetchedStash, nil
    }
}

func ValidateStashProps(props *StashProps) error {

    if len(strings.TrimSpace(props.Name)) <= 0 {
        return errors.New("Name must be non-empty string")
    }

    return nil
}
