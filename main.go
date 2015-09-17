package main

import (
    "database/sql"
    "fmt"
    "math"
    "os"

    // 3rd-party
    sqlite "github.com/mattn/go-sqlite3"
)

func main() {

    // let do this! ᕕ( ᐛ )ᕗ

    // adapted from: https://github.com/mattn/go-sqlite3/blob/master/_example/custom_func/main.go
    sql.Register("sqlite3_custom", &sqlite.SQLiteDriver{
        ConnectHook: func(conn *sqlite.SQLiteConn) error {
            if err := conn.RegisterFunc("norm_age", norm_age, true); err != nil {
                return err
            }
            return nil
        },
    })

    var (
        err error
        db  *Database
    )

    /* database */

    // debug
    var profileName string = "foo"

    db, err = FetchDatabase(profileName)
    exitIfErr(err, 1)

    defer db.CleanUp()

    bootAPI(db)
}

func exitIfErr(err error, code int) {
    if err != nil {
        fmt.Println(err)
        os.Exit(code)
    }
}

func norm_age(x int64) float64 {
    return math.Log(float64(x) + math.Exp(1))
}
