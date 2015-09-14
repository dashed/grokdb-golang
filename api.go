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

        // TODO: fetch full card data; not their ids
        // decksAPI.GET("/:id/cards", injectDB(DeckCardsGET))

        decksAPI.PATCH("/:id", injectDB(DeckPATCH))

        decksAPI.DELETE("/:id", injectDB(DeckDELETE))
    }

    cardsAPI := api.Group("/cards")
    {

        cardsAPI.POST("/", injectDB(CardPOST))

        cardsAPI.GET("/:id", injectDB(CardGET))

        // cardsAPI.PATCH("/:id", injectDB(CardPATCH))

        // cardsAPI.DELETE("/:id", injectDB(CardDELETE))

        // cardsAPI.POST("/:id/success", injectDB(CardDELETE))

        // cardsAPI.POST("/:id/fail", injectDB(CardDELETE))
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
