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

// errors
var ErrCardNoSuchCard = errors.New("cards: no such card of given id")

/* types */

type CardProps struct {
    Title       string
    Description string
    Sides       string
    Order       string
    Deck        uint
}

type CardRow struct {
    ID          uint `db:"card_id"`
    Title       string
    Description string
    Sides       string
    Order       string `db:"keyorder"`
    Deck        uint   `db:"deck"`
    CreatedAt   string `db:"created_at"`
    UpdatedAt   string `db:"updated_at"`
}

type CardPOSTRequest struct {
    Title       string `json:"title" binding:"required"`
    Description string `json:"description"`
    Sides       string `json:"sides" binding:"required"`
    Order       string `json:"order"`
    Deck        uint   `json:"deck" binding:"required,min=1"`
}

/* REST Handlers */

// GET /cards/:id
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func CardGET(db *sqlx.DB, ctx *gin.Context) {

    var err error

    // parse id param
    var cardIDString string = strings.ToLower(ctx.Param("id"))

    // fetch card row from the db

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

    var fetchedCardRow *CardRow
    fetchedCardRow, err = GetCard(db, uint(_cardID))
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

    // TODO: fetch card score and MergeResponse
    ctx.JSON(http.StatusOK, CardRowToResponse(fetchedCardRow))
}

// POST /cards
//
// Params:
// id: a unique, positive integer that is the identifier of the assocoated deck
func CardPOST(db *sqlx.DB, ctx *gin.Context) {

    // parse request
    var (
        err         error
        jsonRequest CardPOSTRequest
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

    // fetch deck to verify it exists
    _, err = GetDeck(db, jsonRequest.Deck)
    switch {
    case err == ErrDeckNoSuchDeck:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "canot find deck with given id",
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

    // create card
    var newCardRow *CardRow

    newCardRow, err = CreateCard(db, &CardProps{
        Title:       jsonRequest.Title,
        Description: jsonRequest.Description,
        Sides:       jsonRequest.Sides,
        Order:       jsonRequest.Order,
        Deck:        jsonRequest.Deck,
    })
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to create new card",
        })
        ctx.Error(err)
    }

    // TODO: fetch card score and MergeResponse

    ctx.JSON(http.StatusCreated, CardRowToResponse(newCardRow))
}

/* helpers */

func CardResponse(overrides *gin.H) gin.H {
    defaultResponse := &gin.H{
        "id":          0,  // required
        "title":       "", // required
        "description": "",
        "sides":       "", // required
        "order":       "", // required
        "deck":        0,  // required
    }

    return MergeResponse(defaultResponse, overrides)
}

func CardRowToResponse(cardrow *CardRow) gin.H {
    return CardResponse(&gin.H{
        "id":          cardrow.ID,
        "title":       cardrow.Title,
        "description": cardrow.Description,
        "sides":       cardrow.Sides,
        "order":       cardrow.Order,
        "deck":        cardrow.Deck,
        "created_at":  cardrow.CreatedAt,
        "updated_at":  cardrow.UpdatedAt,
    })
}

func ValidateCardProps(props *CardProps) error {

    if len(props.Title) <= 0 {
        return errors.New("Title must be non-empty string")
    }

    if len(props.Sides) <= 0 {
        return errors.New("Sides must be non-empty string")
    }

    if len(props.Order) <= 0 {
        return errors.New("Order must be non-empty string")
    }

    if props.Deck <= 0 {
        return errors.New("Deck id must be positive non-zero integer")
    }

    return nil
}

func GetCard(db *sqlx.DB, cardID uint) (*CardRow, error) {

    var (
        err   error
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(FETCH_CARD_QUERY, &StringMap{"card_id": cardID})
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

func CreateCard(db *sqlx.DB, props *CardProps) (*CardRow, error) {

    var err error

    // validate card props
    err = ValidateCardProps(props)
    if err != nil {
        return nil, err
    }

    var (
        res   sql.Result
        query string
        args  []interface{}
    )

    query, args, err = QueryApply(CREATE_NEW_CARD_QUERY,
        &StringMap{
            "title":       props.Title,
            "description": props.Description,
            "sides":       props.Sides,
            "keyorder":    props.Order,
            "deck":        props.Deck,
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

    return GetCard(db, uint(insertID))
}
