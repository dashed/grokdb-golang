package main

import (
    "database/sql"
    "errors"

    // 3rd-party
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

/* REST Handlers */

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
