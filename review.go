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
    Card      uint  `db:"card"`
    HideUntil int64 `db:"hide_until"`
    UpdatedAt int64 `db:"updated_at"`
}

/* REST Handlers */

// GET /decks/:id/review
//
// get card within the deck to be reviewed
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
    var fetchedReviewCardRow *CardRow
    fetchedReviewCardRow, err = GetNextReviewCard(db, deckID)

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

    var cardrow gin.H = CardRowToResponse(fetchedReviewCardRow)
    var cardscore gin.H = CardScoreToResponse(fetchedCardScore)

    ctx.JSON(http.StatusOK, MergeResponse(&cardrow, &gin.H{"review": cardscore}))
}

func ReviewCardPATCH(db *sqlx.DB, ctx *gin.Context) {

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

    // parse request body
    var requestPatch StringMap = StringMap{}
    err = ctx.BindJSON(&requestPatch)
    if err != nil {

        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "bad JSON input",
        })
        ctx.Error(err)
        return
    }
    if len(requestPatch) <= 0 {
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": "no JSON input",
            "userMessage":      "no JSON input",
        })
    }

    var patch StringMap = StringMap{} // sanitized

    // validate hide_until
    if _, hasHideUntil := requestPatch["hide_until"]; hasHideUntil == true {

        var hideUntil uint
        hideUntil, err = (func() (uint, error) {
            switch _hide_until := requestPatch["hide_until"].(type) {
            // note that according to docs: http://golang.org/pkg/encoding/json/#Unmarshal
            // JSON numbers are converted to float64
            case float64:
                __hide_until := uint(_hide_until)
                if _hide_until > 0 && _hide_until == float64(__hide_until) {

                    return __hide_until, nil
                }
            }
            return 0, errors.New("given hide_until is invalid")
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

        patch["hide_until"] = hideUntil
    }

    // validate value
    var value uint = 1
    if _, hasValue := requestPatch["value"]; hasValue == true {
        value, err = (func() (uint, error) {
            switch _value := requestPatch["value"].(type) {
            // note that according to docs: http://golang.org/pkg/encoding/json/#Unmarshal
            // JSON numbers are converted to float64
            case float64:
                __value := uint(_value)
                if _value > 0 && _value == float64(__value) {

                    return __value, nil
                }
            }
            return 0, errors.New("given value is invalid")
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

    // validate action
    if _, hasAction := requestPatch["action"]; hasAction == true {

        err = (func() error {
            switch _action := requestPatch["action"].(type) {
            case string:
                __action := strings.ToLower(_action)
                switch __action {
                case "success":
                    _val := uint(fetchedCardScore.Success) + value
                    patch["success"] = _val
                    patch["score"] = calculateScore(_val, uint(fetchedCardScore.Fail))
                case "fail":
                    _val := uint(fetchedCardScore.Fail) + value
                    patch["fail"] = _val
                    patch["score"] = calculateScore(uint(fetchedCardScore.Success), _val)
                case "reset":
                    // noop update
                    patch["updated_at"] = uint(time.Now().Unix())
                default:
                    return errors.New("given action is invalid")
                }
            default:
                return errors.New("given action is invalid")
            }
            return nil
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

    // update card review
    err = UpdateCardScore(db, fetchedCardRow.ID, &patch)

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

func calculateScore(success uint, fail uint) float64 {
    var total uint = success + fail
    var _lidstone float64 = (float64(fail) + 0.5) / float64(total+1)
    return _lidstone
}

func CardScoreResponse(overrides *gin.H) gin.H {
    defaultResponse := &gin.H{
        "success":    0,
        "fail":       0,
        "score":      0,
        "card":       0,
        "hide_until": 0,
        "updated_at": 0,
    }

    return MergeResponse(defaultResponse, overrides)
}

func CardScoreToResponse(cardscore *CardScoreRow) gin.H {
    return CardScoreResponse(&gin.H{
        "success":    cardscore.Success,
        "fail":       cardscore.Fail,
        "score":      cardscore.Score,
        "card":       cardscore.Card,
        "hide_until": cardscore.HideUntil,
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

    var fetchedReviewCard *CardRow = &CardRow{}

    err = db.QueryRowx(query, args...).StructScan(fetchedReviewCard)

    switch {
    case err == sql.ErrNoRows:
        return nil, ErrCardNoSuchCard
    case err != nil:
        return nil, err
    default:
        return fetchedReviewCard, nil
    }
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
