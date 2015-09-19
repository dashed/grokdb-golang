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
            if err := conn.RegisterFunc("norm_score", norm_score, true); err != nil {
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

func norm_score(success int64, fail int64, age int64) float64 {

    var total int64 = success + fail

    // this is Jeffrey-Perks law where h = 0.5
    // References:
    // - http://www.dcs.bbk.ac.uk/~dell/publications/dellzhang_ictir2011.pdf
    // - http://bl.ocks.org/ajschumacher/b9645724d9d842810613
    var lidstone float64 = (float64(fail) + 0.5) / float64(total+1)

    // - favour cards that are seen less frequently
    // - favour less successful cards
    // - penalize more successful cards
    var bias_factor float64 = float64(1+fail) / float64(1+success+total)

    var base float64 = lidstone + 1
    var normalized float64 = lidstone * math.Log(float64(age)*bias_factor+base) / math.Log(base)

    return normalized
}
