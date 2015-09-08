package main

import (
    "fmt"
    "os"
)

func main() {

    // let do this! ᕕ( ᐛ )ᕗ

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
