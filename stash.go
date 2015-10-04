package main

import (
    "database/sql"
    "errors"
    "fmt"
    "math/rand"
    "net/http"
    "strconv"
    "strings"

    // 3rd-party
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

/* variables */
var ErrStashNoSuchStash = errors.New("stashes: no such stash of given id")
var ErrStashNoCardsByStash = errors.New("stashes: stash has no cards")
var ErrStashHasNoCachedReviewCard = errors.New("stash: no cached review card for stash")
var ErrStashNoStashes = errors.New("stash: no stashes")

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

type StashPUTRequest struct {
    Action string `json:"action" binding:"required"`
    CardID uint   `json:"card_id" binding:"required"`
}

type CachedStashReviewCardRow struct {
    Card      uint  `db:"card"`
    Stash     uint  `db:"stash"`
    CreatedAt int64 `db:"created_at"`
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

func StashListGET(db *sqlx.DB, ctx *gin.Context) {

    var err error

    var stashes *([]StashRow)
    stashes, err = StashList(db)
    switch {
    case err == ErrStashNoStashes:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": "no stashes",
            "userMessage":      "no stashes",
        })
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve stash list",
        })
        ctx.Error(err)
        return
    }

    var response []gin.H = make([]gin.H, 0, len(*stashes))

    for _, fetchedStashRow := range *stashes {
        foo := StashRowToResponse(&fetchedStashRow)
        response = append(response, foo)
    }

    ctx.JSON(http.StatusOK, response)
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

    // check requested stash exists

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

    var (
        fetchedStashRow *StashRow = nil
    )

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

func StashPUT(db *sqlx.DB, ctx *gin.Context) {

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

    var jsonRequest StashPUTRequest
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

    // validate action
    jsonRequest.Action = strings.ToLower(jsonRequest.Action)
    switch jsonRequest.Action {
    case "add":
    case "remove":
    default:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "given action is invalid",
            "userMessage":      "given action is invalid",
        })
        return
    }

    // ensure stash exists

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

    // ensure card id exists

    _, err = GetCard(db, jsonRequest.CardID)
    switch {
    case err == ErrCardNoSuchCard:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "cannot find card by id",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card",
        })
        ctx.Error(err)
        return
    }

    err = ProcessCardWithStash(db, stashID, jsonRequest.Action, jsonRequest.CardID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to process card with stash",
        })
        ctx.Error(err)
        return
    }

    // success
    ctx.Writer.WriteHeader(http.StatusNoContent)
}

func StashCardsGET(db *sqlx.DB, ctx *gin.Context) {

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
        query = FETCH_CARDS_BY_STASH_SORT_CREATED_QUERY(orderQueryString)
    case sortQueryString == "updated_at":
        query = FETCH_CARDS_BY_STASH_SORT_UPDATED_QUERY(orderQueryString)
    case sortQueryString == "title":
        query = FETCH_CARDS_BY_STASH_SORT_TITLE_QUERY(orderQueryString)
    case sortQueryString == "reviewed_at":
        query = FETCH_CARDS_BY_STASH_REVIEWED_DATE_QUERY(orderQueryString)
    case sortQueryString == "times_reviewed":
        query = FETCH_CARDS_BY_STASH_TIMES_REVIEWED_QUERY(orderQueryString)
    default:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "invalid sort query",
            "userMessage":      "invalid sort query",
        })
        return
    }

    // ensure stash exists
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

    // fetch cards
    var cards *([]CardRow)
    cards, err = CardsByStash(db, query, stashID, page, per_page)

    switch {
    case err == ErrStashNoCardsByStash:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": "stash has no cards",
            "userMessage":      "stash has no cards",
        })
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
            "userMessage":      "unable to retrieve cards for stash",
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

        var cardrow gin.H = CardRowToResponse(db, &cr)
        var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

        foo := MergeResponse(&cardrow, &gin.H{"review": cardscore})
        response = append(response, foo)
    }

    ctx.JSON(http.StatusOK, response)
}

func ReviewStashGET(db *sqlx.DB, ctx *gin.Context) {

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

    // ensure stash exists
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

    // get count of cards available to fetch
    var count uint
    count, err = CountCardsByStash(db, stashID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve review card count",
        })
        ctx.Error(err)
        return
    }

    if count <= 0 {
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": "no review card available",
            "userMessage":      "no review card available",
        })
        ctx.Error(err)
        return
    }

    var purgatory_size int = GetPurgatorySize(int(count))

    // fetch review card
    var fetchedReviewCardRow *CardRow
    fetchedReviewCardRow, err = GetNextReviewCardOfStash(db, stashID, purgatory_size)

    switch {
    case err == ErrCardNoSuchCard:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "no review card available",
        })
        ctx.Error(err)
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card",
        })
        ctx.Error(err)
        return
    }

    // fetch card's score
    var fetchedCardScore *CardScoreRow
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedReviewCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    var cardrow gin.H = CardRowToResponse(db, fetchedReviewCardRow)
    var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

    ctx.JSON(http.StatusOK, MergeResponse(&cardrow, &gin.H{"review": cardscore}))
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

func ProcessCardWithStash(db *sqlx.DB, stashID uint, action string, cardID uint) error {

    var (
        err       error
        connected bool = false
    )

    action = strings.ToLower(action)
    switch action {
    case "add":
    case "remove":
    default:
        return errors.New("unknown given action for ProcessCardWithStash")
    }

    // check if card is connected with stash
    connected, err = CardConnectedWithStash(db, stashID, cardID)

    if err != nil {
        return err
    }

    switch action {
    case "add":
        // noop
        if connected {
            return nil
        }

        err = ConnectCardToStash(db, stashID, cardID)
        if err != nil {
            return err
        }
    case "remove":
        // noop
        if !connected {
            return nil
        }

        err = DisconnectCardFromStash(db, stashID, cardID)
        if err != nil {
            return err
        }
    }

    return nil
}

func CardConnectedWithStash(db *sqlx.DB, stashID uint, cardID uint) (bool, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(STASH_HAS_CARD_QUERY, &StringMap{
        "stash_id": stashID,
        "card_id":  cardID,
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

func ConnectCardToStash(db *sqlx.DB, stashID uint, cardID uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(CONNECT_STASH_TO_CARD_QUERY, &StringMap{"stash_id": stashID, "card_id": cardID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func DisconnectCardFromStash(db *sqlx.DB, stashID uint, cardID uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(DISCONNECT_STASH_FROM_CARD_QUERY, &StringMap{"stash_id": stashID, "card_id": cardID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func CardsByStash(db *sqlx.DB, queryTransform PipeInput, stashID uint, page uint, per_page uint) (*([]CardRow), error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    // invariant: page >= 1

    var offset uint = (page - 1) * per_page

    var count uint
    count, err = CountCardsByStash(db, stashID)
    if err != nil {
        return nil, err
    }

    if count <= 0 {
        return nil, ErrStashNoCardsByStash
    }

    if offset >= count {
        return nil, ErrCardPageOutOfBounds
    }

    query, args, err = QueryApply(queryTransform, &StringMap{
        "stash_id": stashID,
        "per_page": per_page,
        "offset":   offset,
    })
    if err != nil {
        return nil, err
    }

    var cards []CardRow = make([]CardRow, 0, per_page)
    err = db.Select(&cards, query, args...)
    if err != nil {
        return nil, err
    }

    if len(cards) <= 0 {
        return nil, ErrStashNoCardsByStash
    }

    return &cards, nil
}

func CountCardsByStash(db *sqlx.DB, stashID uint) (uint, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(COUNT_CARDS_BY_STASH_QUERY, &StringMap{
        "stash_id": stashID,
    })
    if err != nil {
        return 0, err
    }

    var count uint
    err = db.QueryRowx(query, args...).Scan(&count)
    if err != nil {
        return 0, err
    }

    return count, nil
}

func GetNextReviewCardOfStash(db *sqlx.DB, stashID uint, _purgatory_size int) (*CardRow, error) {

    var (
        err     error
        queryfn PipeInput = FETCH_NEXT_REVIEW_CARD_BY_STASH_ORDER_BY_NORM_SCORE
        args    []interface{}
    )

    var fetchedRow *CachedStashReviewCardRow
    fetchedRow, err = GetCachedReviewCardByStash(db, stashID)

    switch {
    case err == ErrStashHasNoCachedReviewCard:
    case err != nil:
        return nil, err
    case fetchedRow != nil:
        var fetchedReviewCard *CardRow
        fetchedReviewCard, err = GetCard(db, fetchedRow.Card)
        switch {
        case err == ErrCardNoSuchCard:
            // card may have been deleted
            break
        case err != nil:
            return nil, err
        default:
            return fetchedReviewCard, nil
        }
    }

    // no cached review card

    if _purgatory_size <= 0 {
        return nil, errors.New("invalid _purgatory_size")
    }

    var purgatory_size int = 10
    var purgatory_index int = 0

    var chosenmethod reviewmethod = ChooseMethod()

    switch chosenmethod {
    case OLDEST:

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_STASH_ORDER_BY_AGE
        purgatory_size = 1
        purgatory_index = 0

        fmt.Println("age")

    case HIGHEST_NORM_SCORE:

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_STASH_ORDER_BY_NORM_SCORE
        purgatory_size = _purgatory_size
        purgatory_index = 0

        fmt.Println("highest norm")

    case RANDOM_CARD:

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_STASH_ORDER_BY_AGE // more efficient
        purgatory_size = 1
        purgatory_index = rand.Intn(_purgatory_size) // returns int from [0, _purgatory_size)

        fmt.Println("random")
    }

    var query string
    query, args, err = QueryApply(queryfn, &StringMap{
        "stash_id":        stashID,
        "purgatory_size":  purgatory_size,
        "purgatory_index": purgatory_index,
    })

    if err != nil {
        return nil, err
    }

    var fetchedReviewCard *CardRow = &CardRow{}
    err = db.QueryRowx(query, args...).StructScan(fetchedReviewCard)

    switch {
    case err == sql.ErrNoRows:
        return nil, ErrCardNoSuchCard
    case err != nil:
        return nil, err
    default:

        // cache card
        err = SetCachedReviewCardByStash(db, stashID, fetchedReviewCard.ID)
        if err != nil {
            return nil, err
        }

        return fetchedReviewCard, nil
    }
}

func GetCachedReviewCardByStash(db *sqlx.DB, stashID uint) (*CachedStashReviewCardRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(GET_CACHED_REVIEWCARD_BY_STASH_QUERY, &StringMap{
        "stash_id": stashID,
    })
    if err != nil {
        return nil, err
    }

    var fetchedRow *CachedStashReviewCardRow = &CachedStashReviewCardRow{}

    // ErrNoRows

    err = db.QueryRowx(query, args...).StructScan(fetchedRow)
    switch {
    case err == sql.ErrNoRows:
        return nil, ErrStashHasNoCachedReviewCard
    case err != nil:
        return nil, err
    default:
        return fetchedRow, nil
    }
}

func SetCachedReviewCardByStash(db *sqlx.DB, stashID uint, cardID uint) error {

    var err error

    err = DeleteCachedReviewCardByStash(db, stashID)
    if err != nil {
        return err
    }

    // insert record into db

    var (
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(INSERT_CACHED_REVIEWCARD_BY_STASH_QUERY,
        &StringMap{
            "stash_id": stashID,
            "card_id":  cardID,
        })
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func DeleteCachedReviewCardByStash(db *sqlx.DB, stashID uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(DELETE_CACHED_REVIEWCARD_BY_STASH_QUERY, &StringMap{"stash_id": stashID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}

func CountStashes(db *sqlx.DB) (uint, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(COUNT_STASHES_QUERY)
    if err != nil {
        return 0, err
    }

    var count uint
    err = db.QueryRowx(query, args...).Scan(&count)
    if err != nil {
        return 0, err
    }

    return count, nil
}

func StashList(db *sqlx.DB) (*([]StashRow), error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    var count uint
    count, err = CountStashes(db)
    if err != nil {
        return nil, err
    }

    if count <= 0 {
        return nil, ErrStashNoStashes
    }

    query, args, err = QueryApply(FETCH_STASHES_QUERY)
    if err != nil {
        return nil, err
    }

    var stashes []StashRow = make([]StashRow, 0, count)
    err = db.Select(&stashes, query, args...)
    if err != nil {
        return nil, err
    }

    if len(stashes) <= 0 {
        return nil, ErrStashNoStashes
    }

    return &stashes, nil
}
