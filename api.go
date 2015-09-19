package main

import (
    // 3rd-party
    "github.com/gin-gonic/contrib/static"
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

func bootAPI(db *Database) {

    var err error

    /* bootstrap data */
    _, err = GetRootDeck(db.instance)
    exitIfErr(err, 1)

    /* set up REST api */

    injectDB := bindDB(db.instance)

    api := gin.Default()

    api.Use(static.Serve("/", static.LocalFile("./assets/", true)))

    // decks group
    decksAPI := api.Group("/decks")
    {
        decksAPI.POST("/", injectDB(DeckPOST))

        // TODO: implement
        // decksAPI.GET("/", injectDB(DeckGETMany))

        decksAPI.GET("/:id", injectDB(DeckGET))

        decksAPI.GET("/:id/children", injectDB(DeckChildrenGET))

        decksAPI.GET("/:id/ancestors", injectDB(DeckAncestorsGET))

        decksAPI.GET("/:id/cards", injectDB(DeckCardsGET))

        decksAPI.GET("/:id/cards/count", injectDB(DeckCardsCountGET))

        // decksAPI.GET("/:id/cards/stats", injectDB(DeckCardsstatsGET))

        decksAPI.PATCH("/:id", injectDB(DeckPATCH))

        decksAPI.DELETE("/:id", injectDB(DeckDELETE))

        // get card within the deck to be reviewed
        decksAPI.GET("/:id/review", injectDB(ReviewDeckGET))
    }

    cardsAPI := api.Group("/cards")
    {

        cardsAPI.POST("/", injectDB(CardPOST))

        cardsAPI.GET("/:id", injectDB(CardGET))

        // TODO: implement
        // ?page=1 per_page=25
        // prefer to use DeckCardsGET
        // cardsAPI.GET("/", injectDB(CardGETMany))

        cardsAPI.PATCH("/:id", injectDB(CardPATCH))

        // cardsAPI.DELETE("/:id", injectDB(CardDELETE))

        cardsAPI.PATCH("/:id/review", injectDB(ReviewCardPATCH))

    }

    configsAPI := api.Group("/configs")
    {
        configsAPI.GET("/:setting", injectDB(ConfigGET))

        configsAPI.POST("/:setting", injectDB(ConfigPOST))
    }

    api.Run(":3030")
}

/* helpers */

func bindDB(db *sqlx.DB) func(func(*sqlx.DB, *gin.Context)) func(*gin.Context) {
    return func(handler func(*sqlx.DB, *gin.Context)) func(*gin.Context) {
        return func(ctx *gin.Context) {
            handler(db, ctx)
        }
    }
}

func MergeResponse(dest *gin.H, src *gin.H) gin.H {
    for k, v := range *src {
        (*dest)[k] = v
    }
    return *dest
}
