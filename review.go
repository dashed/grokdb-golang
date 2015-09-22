package main

import (
    "database/sql"
    "errors"
    "math"
    "math/rand"
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
var ErrCardHasNoCachedReviewCard = errors.New("review: no cached review card for deck")

/* types */

type CardScoreRow struct {
    Success       int
    Fail          int
    Score         float64
    Card          uint  `db:"card"`
    TimesReviewed int64 `db:"times_reviewed"`
    UpdatedAt     int64 `db:"updated_at"`
}

type CachedReviewCardRow struct {
    Card      uint  `db:"card"`
    Deck      uint  `db:"deck"`
    CreatedAt int64 `db:"created_at"`
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

    // get count of cards available to fetch
    var count int
    count, err = CountReviewCardsByDeck(db, deckID)
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

    // determine purgatory_size
    var purgatory_size int = 10

    if count < 50 {
        purgatory_size = int(math.Ceil(0.2 * float64(count)))
    } else {
        purgatory_size = 10
    }

    // fetch review card
    var fetchedReviewCardRow *CardRow
    fetchedReviewCardRow, err = GetNextReviewCard(db, deckID, purgatory_size)

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

// PATCH /cards/:id/review
//
// Params:
// action: one of: success, fail, reset, skip, forgot
// value: amount to add to success or fail. must be positive non-zero int (optional. default: 1)
// changelog: description of the patch
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

    // validate changelog
    if _, hasChangelog := requestPatch["changelog"]; hasChangelog == true {

        var changelog string
        changelog, err = (func() (string, error) {
            switch _changelog := requestPatch["changelog"].(type) {
            case string:
                return _changelog, nil
            }
            return "", errors.New("given changelog is invalid")
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

        patch["changelog"] = changelog
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
                    patch["times_reviewed"] = fetchedCardScore.TimesReviewed + 1
                case "fail":
                    _val := uint(fetchedCardScore.Fail) + value
                    patch["fail"] = _val
                    patch["score"] = calculateScore(uint(fetchedCardScore.Success), _val)
                    patch["times_reviewed"] = fetchedCardScore.TimesReviewed + 1
                case "reset":
                    patch["fail"] = 0
                    patch["success"] = 0
                    patch["score"] = calculateScore(0, 0)
                case "forgot":
                    patch["fail"] = 2 // minor boost
                    patch["success"] = 0
                    patch["score"] = calculateScore(0, 2)
                    patch["times_reviewed"] = fetchedCardScore.TimesReviewed + 1
                case "skip":
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

    // remove card from reviewcache
    err = DeleteCachedReviewCardByDeck(db, fetchedCardRow.Deck)

    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to delete review cache",
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
        "success":        0,
        "fail":           0,
        "score":          0,
        "card":           0,
        "times_reviewed": 0,
        "updated_at":     0,
    }

    return MergeResponse(defaultResponse, overrides)
}

func CardScoreToResponse(cardscore *CardScoreRow) gin.H {
    return CardScoreResponse(&gin.H{
        "success":        cardscore.Success,
        "fail":           cardscore.Fail,
        "score":          cardscore.Score,
        "card":           cardscore.Card,
        "times_reviewed": cardscore.TimesReviewed,
        "updated_at":     cardscore.UpdatedAt,
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

// alias method:
// - ref: http://stackoverflow.com/questions/5027757/data-structure-for-loaded-dice
// - ref: http://www.keithschwarz.com/darts-dice-coins/
const __OLDEST = 0.1
const __HIGHEST_NORM_SCORE = 0.75
const __RANDOM = 0.15

func GetNextReviewCard(db *sqlx.DB, deckID uint, _purgatory_size int) (*CardRow, error) {

    var (
        err     error
        queryfn PipeInput = FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_NORM_SCORE
        args    []interface{}
    )

    var fetchedRow *CachedReviewCardRow
    fetchedRow, err = GetCachedReviewCardByDeck(db, deckID)

    switch {
    case err == ErrCardHasNoCachedReviewCard:
    case err != nil:
        return nil, err
    case fetchedRow != nil:
        var fetchedReviewCard *CardRow
        fetchedReviewCard, err = GetCard(db, fetchedRow.Card)
        switch {
        case err == ErrCardNoSuchCard:
            break
        case err != nil:
            return nil, err
        default:
            return fetchedReviewCard, nil
        }
    }

    if _purgatory_size <= 0 {
        return nil, errors.New("invalid _purgatory_size")
    }

    var purgatory_size int = 10
    var purgatory_index int = 0

    var pin float64 = rand.Float64()

    // alias method
    // TODO: needs refactor
    switch {
    case pin <= __OLDEST:

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_AGE
        purgatory_size = 1
        purgatory_index = 0

    case pin > __OLDEST && pin <= (__OLDEST+__HIGHEST_NORM_SCORE):

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_NORM_SCORE
        purgatory_size = _purgatory_size
        purgatory_index = 0

    case pin > (__OLDEST + __HIGHEST_NORM_SCORE):

        queryfn = FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_AGE // more efficient
        purgatory_size = _purgatory_size
        purgatory_index = rand.Intn(_purgatory_size)
    }

    var query string
    query, args, err = QueryApply(queryfn, &StringMap{
        "deck_id":         deckID,
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
        err = SetCachedReviewCardByDeck(db, deckID, fetchedReviewCard.ID)
        if err != nil {
            return nil, err
        }

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

func CountReviewCardsByDeck(db *sqlx.DB, deckID uint) (int, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(COUNT_REVIEW_CARDS_BY_DECK, &StringMap{
        "deck_id": deckID,
    })
    if err != nil {
        return 0, err
    }

    var count int
    err = db.QueryRowx(query, args...).Scan(&count)
    if err != nil {
        return 0, err
    }

    return count, nil
}

func GetCachedReviewCardByDeck(db *sqlx.DB, deckID uint) (*CachedReviewCardRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(GET_CACHED_REVIEWCARD_BY_DECK_QUERY, &StringMap{
        "deck_id": deckID,
    })
    if err != nil {
        return nil, err
    }

    var fetchedRow *CachedReviewCardRow = &CachedReviewCardRow{}

    // ErrNoRows

    err = db.QueryRowx(query, args...).StructScan(fetchedRow)
    switch {
    case err == sql.ErrNoRows:
        return nil, ErrCardHasNoCachedReviewCard
    case err != nil:
        return nil, err
    default:
        return fetchedRow, nil
    }
}

func SetCachedReviewCardByDeck(db *sqlx.DB, deckID uint, cardID uint) error {

    var err error

    err = DeleteCachedReviewCardByDeck(db, deckID)
    if err != nil {
        return err
    }

    // insert record into db

    var (
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(INSERT_CACHED_REVIEWCARD_BY_DECK_QUERY,
        &StringMap{
            "deck_id": deckID,
            "card_id": cardID,
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

func DeleteCachedReviewCardByDeck(db *sqlx.DB, deckID uint) error {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(DELETE_CACHED_REVIEWCARD_BY_DECK_QUERY, &StringMap{"deck_id": deckID})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}
