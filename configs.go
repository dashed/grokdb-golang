package main

import (
    "database/sql"
    "errors"
    "net/http"
    "strings"

    // 3rd-party
    "github.com/gin-gonic/gin"
    "github.com/jmoiron/sqlx"
)

/* variables */
const CONFIG_ROOT string = "CONFIG_ROOT"

var ErrConfigEmptyStringSetting = errors.New("configs: given config setting that is an empty string")
var ErrConfigNoSuchSetting = errors.New("configs: no such config setting")

/* types */

type Config struct {
    Setting string
    Value   string
}

type ConfigPOSTRequest struct {
    Value string `json:"value" binding:"required"`
}

/* REST Handlers */

// GET /configs/:setting
//
// Params:
// setting: name of the config
func ConfigGET(db *sqlx.DB, ctx *gin.Context) {

    var err error

    // parse id param
    var setting string = strings.ToLower(ctx.Param("setting"))

    var config *Config
    config, err = GetConfig(db, setting)
    switch {
    case err == ErrConfigNoSuchSetting:
        ctx.JSON(http.StatusNotFound, gin.H{
            "status":           http.StatusNotFound,
            "developerMessage": err.Error(),
            "userMessage":      "unable to find config setting",
        })
        return
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to retrieve config setting",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "setting": config.Setting,
        "value":   config.Value,
    })
}

// POST /configs/:setting
//
// Params:
// setting: name of the config
func ConfigPOST(db *sqlx.DB, ctx *gin.Context) {

    var (
        err         error
        jsonRequest ConfigPOSTRequest
    )

    // parse setting param
    var setting string = strings.ToLower(ctx.Param("setting"))

    // parse request

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

    err = SetConfig(db, setting, jsonRequest.Value)
    switch {
    case err == ErrConfigEmptyStringSetting:
        ctx.JSON(http.StatusBadRequest, gin.H{
            "status":           http.StatusBadRequest,
            "developerMessage": err.Error(),
            "userMessage":      "given config setting is an empty string",
        })
        ctx.Error(err)
    case err != nil:
        ctx.JSON(http.StatusInternalServerError, gin.H{
            "status":           http.StatusInternalServerError,
            "developerMessage": err.Error(),
            "userMessage":      "unable to set config setting",
        })
        ctx.Error(err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{
        "setting": setting,
        "value":   jsonRequest.Value,
    })
}

/* helpers */

func GetConfig(db *sqlx.DB, setting string) (*Config, error) {

    // ensure setting is a non-empty string
    if len(setting) <= 0 {
        return nil, ErrConfigEmptyStringSetting
    }

    var (
        query string
        args  []interface{}
        err   error
    )

    query, args, err = QueryApply(FETCH_CONFIG_SETTING_QUERY, &StringMap{"setting": setting})
    if err != nil {
        return nil, err
    }

    var fetchedConfig *Config = &Config{}

    err = db.QueryRowx(query, args...).StructScan(fetchedConfig)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, ErrConfigNoSuchSetting
        }

        return nil, err
    }
    return fetchedConfig, nil
}

func SetConfig(db *sqlx.DB, setting string, value string) error {

    // ensure setting is a non-empty string
    if len(setting) <= 0 {
        return ErrConfigEmptyStringSetting
    }

    var (
        query string
        args  []interface{}
        err   error
    )

    query, args, err = QueryApply(SET_CONFIG_SETTING_QUERY, &StringMap{"setting": setting, "value": value})
    if err != nil {
        return err
    }

    _, err = db.Exec(query, args...)
    if err != nil {
        return err
    }

    return nil
}
