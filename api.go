package main

import (
    "fmt"
    "net/http"
    "strings"

    // 3rd-party
    assetfs "github.com/elazarl/go-bindata-assetfs"
    "github.com/gin-gonic/contrib/static"
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

func bootAPI(db *Database, portNum int, appPath string, mathjaxPath string) {

    var err error

    /* bootstrap data */
    _, err = GetRootDeck(db.instance)
    exitIfErr(err, 1)

    /* set up REST api */

    injectDB := bindDB(db.instance)

    api := gin.Default()

    if len(appPath) > 0 {
        api.Use(static.Serve("/", static.LocalFile(appPath, true)))
    } else {
        api.Use(static.Serve("/", BinaryFileSystem("assets")))
    }

    var local_mathjax bool = len(mathjaxPath) > 0

    if local_mathjax {
        api.Use(static.Serve("/mathjax", static.LocalFile(mathjaxPath, true)))
    }

    api.GET("/env", func(ctx *gin.Context) {
        ctx.JSON(http.StatusOK, gin.H{
            "local_mathjax": local_mathjax,
        })
    })

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

        // TODO: needed?
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

        cardsAPI.DELETE("/:id", injectDB(CardDELETE))

        cardsAPI.PATCH("/:id/review", injectDB(ReviewCardPATCH))
    }

    stashesAPI := api.Group("/stashes")
    {
        stashesAPI.POST("/", injectDB(StashPOST))

        stashesAPI.GET("/", injectDB(StashListGET))

        stashesAPI.GET("/:id", injectDB(StashGET))

        stashesAPI.DELETE("/:id", injectDB(StashDELETE))

        stashesAPI.PATCH("/:id", injectDB(StashPATCH))

        stashesAPI.PUT("/:id", injectDB(StashPUT))

        stashesAPI.GET("/:id/cards", injectDB(StashCardsGET))

        stashesAPI.GET("/:id/cards/count", injectDB(StashCardsCountGET))

        stashesAPI.GET("/:id/review", injectDB(ReviewStashGET))
    }

    configsAPI := api.Group("/configs")
    {
        configsAPI.GET("/:setting", injectDB(ConfigGET))

        configsAPI.POST("/:setting", injectDB(ConfigPOST))
    }

    api.Run(fmt.Sprintf(":%d", portNum))
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

func MergeResponses(sources ...*gin.H) gin.H {

    var source gin.H = *sources[len(sources)-1]

    for idx := (len(sources) - 2); idx >= 0; idx-- {
        var src *gin.H = sources[idx]
        source = MergeResponse(src, &source)
    }
    return source
}

// taken from https://github.com/gin-gonic/contrib/blob/14f66d54cdb96059bafca98665bcc6d9df4951f2/static/example/bindata/example.go

type binaryFileSystem struct {
    fs http.FileSystem
}

func (b *binaryFileSystem) Open(name string) (http.File, error) {
    return b.fs.Open(name)
}

func (b *binaryFileSystem) Exists(prefix string, filepath string) bool {

    if p := strings.TrimPrefix(filepath, prefix); len(p) < len(filepath) {
        if _, err := b.fs.Open(p); err != nil {
            return false
        }
        return true
    }
    return false
}

func BinaryFileSystem(root string) *binaryFileSystem {
    fs := &assetfs.AssetFS{Asset, AssetDir, root}
    return &binaryFileSystem{
        fs,
    }
}
