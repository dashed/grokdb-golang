package main

import (
    "database/sql"
    "errors"
    "net/http"
    "strconv"
    "strings"
    "time"

    // 3rd-party
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

/* variables */
var ErrCardHasNoScore = errors.New("cardscore: this card has no score record")

/* types */

type CardScoreRow struct {
    Success   int
    Fail      int
    Score     float64
    Card      uint   `db:"card"`
    ActiveAt  string `db:"active_at"`
    UpdatedAt string `db:"updated_at"`
}

type CardScorePOSTRequest struct {
    ActiveAt string `json:"active_at"`
}

/* REST Handlers */

// GET /decks/:id/review
//
func ReviewDeckGET(db *sqlx.DB, ctx *gin.Context) {

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

    // fetch review card
    var fetchedCardRow *CardRow
    fetchedCardRow, err = GetNextReviewCard(db, deckID)

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
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    var cardrow gin.H = CardRowToResponse(fetchedCardRow)
    var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

    ctx.JSON(http.StatusOK, MergeResponse(&cardrow, &gin.H{"review": cardscore}))
}

func ReviewCardSuccessPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var cardIDString string = strings.ToLower(ctx.Param("id"))

    _cardID, err := strconv.ParseUint(cardIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var cardID uint = uint(_cardID)

    // parse request
    var (
        jsonRequest CardScorePOSTRequest
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

    // parse active_at
    if len(jsonRequest.ActiveAt) > 0 {
        err = testTime(jsonRequest.ActiveAt)
        if err != nil {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "invalid active_at format",
            })
            ctx.Error(err)
            return
        }

    } else {
        jsonRequest.ActiveAt = time.Now().UTC().Format("2006-01-02 15:04:05Z")
    }

    // verify card id exists
    var fetchedCardRow *CardRow
    fetchedCardRow, err = GetCard(db, cardID)

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

    // fetch card's score
    var fetchedCardScore *CardScoreRow
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    err = ApplySuccessToCard(db, fetchedCardScore, fetchedCardRow, jsonRequest.ActiveAt)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to update card score record",
        })
        ctx.Error(err)
        return
    }

    // refetch card's score
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    var cardrow gin.H = CardRowToResponse(fetchedCardRow)
    var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

    ctx.JSON(http.StatusOK, MergeResponse(&cardrow, &gin.H{"review": cardscore}))
}

func ReviewCardFailPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse id param
    var cardIDString string = strings.ToLower(ctx.Param("id"))

    _cardID, err := strconv.ParseUint(cardIDString, 10, 32)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given id is invalid",
        })
        ctx.Error(err)
        return
    }
    var cardID uint = uint(_cardID)

    // parse request
    var (
        jsonRequest CardScorePOSTRequest
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

    // parse active_at
    if len(jsonRequest.ActiveAt) > 0 {
        err = testTime(jsonRequest.ActiveAt)
        if err != nil {
            ctx.JSON(http.StatusBadRequest, gin.H{
                "status":           http.StatusBadRequest,
                "developerMessage": err.Error(),
                "userMessage":      "invalid active_at format",
            })
            ctx.Error(err)
            return
        }

    } else {
        jsonRequest.ActiveAt = time.Now().UTC().Format("2006-01-02 15:04:05Z")
    }

    // verify card id exists
    var fetchedCardRow *CardRow
    fetchedCardRow, err = GetCard(db, cardID)

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

    // fetch card's score
    var fetchedCardScore *CardScoreRow
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    err = ApplyFailToCard(db, fetchedCardScore, fetchedCardRow, jsonRequest.ActiveAt)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to update card score record",
        })
        ctx.Error(err)
        return
    }

    // refetch card's score
    fetchedCardScore, err = GetCardScoreRecord(db, fetchedCardRow.ID)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve card score record",
        })
        ctx.Error(err)
        return
    }

    var cardrow gin.H = CardRowToResponse(fetchedCardRow)
    var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

    ctx.JSON(http.StatusOK, MergeResponse(&cardrow, &gin.H{"review": cardscore}))
}

/* helpers */

func CardScoreResponse(overrides *gin.H) gin.H {
    defaultResponse := &gin.H{
        "success":    0,
        "fail":       0,
        "score":      0,
        "card":       0,
        "active_at":  "",
        "updated_at": "",
    }

    return MergeResponse(defaultResponse, overrides)
}

func CardScoreToResponse(cardscore *CardScoreRow) gin.H {
    return CardScoreResponse(&gin.H{
        "success":    cardscore.Success,
        "fail":       cardscore.Fail,
        "score":      cardscore.Score,
        "card":       cardscore.Card,
        "active_at":  cardscore.ActiveAt,
        "updated_at": cardscore.UpdatedAt,
    })
}

func GetCardScoreRecord(db *sqlx.DB, cardID uint) (*CardScoreRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(FETCH_CARD_SCORE, &StringMap{"card_id": cardID})
    if err != nil {
        return nil, err
    }

    var fetchedCardScore *CardScoreRow = &CardScoreRow{}

    err = db.QueryRowx(query, args...).StructScan(fetchedCardScore)
    switch {
    case err == sql.ErrNoRows:
        return nil, ErrCardHasNoScore
    case err != nil:
        return nil, err
    default:
        return fetchedCardScore, nil
    }
}

func GetNextReviewCard(db *sqlx.DB, deckID uint) (*CardRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(FETCH_NEXT_REVIEW_CARD_BY_DECK, &StringMap{"deck_id": deckID})
    if err != nil {
        return nil, err
    }

    var fetchedCard *CardRow = &CardRow{}

    err = db.QueryRowx(query, args...).StructScan(fetchedCard)

    switch {
    case err == sql.ErrNoRows:
        return nil, ErrCardNoSuchCard
    case err != nil:
        return nil, err
    default:
        return fetchedCard, nil
    }
}

func ApplySuccessToCard(db *sqlx.DB, cardscore *CardScoreRow, card *CardRow, activeAt string) error {

    var newSuccess int = cardscore.Success + 1

    var patch StringMap = StringMap{
        "card_id":   card.ID,
        "success":   newSuccess,
        "score":     calculateScore(newSuccess, cardscore.Fail),
        "active_at": activeAt,
    }

    return UpdateCardScore(db, card.ID, &patch)
}

func ApplyFailToCard(db *sqlx.DB, cardscore *CardScoreRow, card *CardRow, activeAt string) error {

    var newFail int = cardscore.Fail + 1

    var patch StringMap = StringMap{
        "card_id":   card.ID,
        "fail":      newFail,
        "score":     calculateScore(cardscore.Success, newFail),
        "active_at": activeAt,
    }

    return UpdateCardScore(db, card.ID, &patch)
}

func UpdateCardScore(db *sqlx.DB, cardID uint, patch *StringMap) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(UPDATE_CARD_SCORE_QUERY, &StringMap{"card_id": cardID}, patch)
    if err != nil {
        return err
    }

    var res sql.Result
    res, err = db.Exec(query, args...)

    if err != nil {
        return err
    }

    // ensure card score is patched
    num, err := res.RowsAffected()
    if err != nil {
        return err
    }

    if num <= 0 {
        return errors.New("unable to update card score record")
    }
    return nil
}

func calculateScore(success int, fail int) float64 {
    var numerator float64 = float64(fail) + 0.5
    var denominator float64 = float64(success + fail + 1)
    return numerator / denominator
}

func testTime(timeString string) error {

    // sqlite
    _, err := time.Parse("2006-01-02 15:04:05Z", timeString)
    if err == nil {
        return nil
    }

    // js
    _, err = time.Parse("2006-01-02T15:04:05Z", timeString)
    if err == nil {
        return nil
    }
    return nil
}
