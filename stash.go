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

func StashDELETE(db *sqlx.DB, ctx *gin.Context) {

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

    _, err = GetStash(db, stashID)
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

    // delete stash
    err = DeleteStash(db, stashID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to delete stash",
        })
        ctx.Error(err)
        return
    }

    // ensure stash is deleted

    _, err = GetStash(db, stashID)
    switch {
    case err == ErrStashNoSuchStash:
        // success
        ctx.Writer.WriteHeader(http.StatusNoContent)
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

    ctx.JSON(http.StatusInternalServerError, gin.H{
        "status":           http.StatusInternalServerError,
        "developerMessage": err.Error(),
        "userMessage":      "unable to delete stash",
    })
}

func StashPATCH(db *sqlx.DB, ctx *gin.Context) {

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

    // ensure name, if given, is non-empty string
    if _, hasNameKey := (*patch)["name"]; hasNameKey == true {

        _, err = (func() (string, error) {
            switch _stashName := (*patch)["name"].(type) {
            case string:
                if len(strings.TrimSpace(_stashName)) > 0 {
                    return _stashName, nil
                }

            }
            return "", errors.New("new stash name is invalid")
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
    }

    // ensure description, if given, is non-empty string
    if _, hasDescriptionKey := (*patch)["description"]; hasDescriptionKey == true {

        _, err = (func() (string, error) {
            switch _stashDescription := (*patch)["description"].(type) {
            case string:
                return _stashDescription, nil
            }
            return "", errors.New("new stash description is invalid")
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
    }

    var (
        fetchedStashRow *StashRow = nil
    )

    // check requested stash exists and fetch it

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

    // generate SQL to patch stash
    var (
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(UPDATE_STASH_QUERY, &StringMap{"stash_id": stashID}, patch)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to generate patch stash SQL",
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
            "userMessage":      "unable to patch stash",
        })
        ctx.Error(err)
        return
    }

    // ensure stash is patched
    num, err := res.RowsAffected()
    if err != nil {
        // TODO: transaction rollback
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to patch stash",
        })
        ctx.Error(err)
        return
    }

    if num <= 0 {
        // TODO: transaction rollback
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "given JSON is invalid",
            "userMessage":      "given JSON is invalid",
        })
        return
    }

    // fetch stash row from the db

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

func ValidateStashProps(props *StashProps) error {

    if len(strings.TrimSpace(props.Name)) <= 0 {
        return errors.New("Name must be non-empty string")
    }

    return nil
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

func DeleteStash(db *sqlx.DB, stashID uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(DELETE_STASH_QUERY, &StringMap{"stash_id": stashID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}
