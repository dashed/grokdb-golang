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
        // create a new deck and attach it to an existing deck
        decksAPI.POST("/", injectDB(DeckPOST))

        decksAPI.GET("/:id", injectDB(DeckGET))

        decksAPI.PATCH("/:id", injectDB(DeckPATCH))

        decksAPI.DELETE("/:id", injectDB(DeckDELETE))
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
