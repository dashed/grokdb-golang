package main

import (
    "database/sql"
    "errors"
    "fmt"
    "math"
    "os"

    // 3rd-party
    "github.com/codegangsta/cli"
    sqlite "github.com/mattn/go-sqlite3"
)

func main() {

    // let do this! ᕕ( ᐛ )ᕗ

    // override the default cli help template
    cli.AppHelpTemplate = helpTemplate

    var cmd *cli.App = cli.NewApp()

    cmd.Name = "butterfoo"
    cmd.Version = "0.0.1"
    cmd.Usage = "flashcard app"

    cmd.Flags = []cli.Flag{
        cli.IntFlag{
            Name:  "port, p",
            Value: 8080,
            Usage: "Port number to serve",
        },
        cli.StringFlag{
            Name:  "mathjax",
            Value: "",
            Usage: "Alternative source folder of MathJax to serve",
        },
        cli.StringFlag{
            Name:  "app",
            Value: "",
            Usage: "Alternative source folder of app to serve",
        },
    }

    cmd.Action = func(ctx *cli.Context) {

        var args cli.Args = ctx.Args()

        if len(args) <= 0 {
            cli.ShowAppHelp(ctx)

            var err error = errors.New("\nError: No profile name given")
            exitIfErr(err, 1)
        }

        var profileName string = args.First()

        var portNum int = ctx.Int("port")
        var mathJax string = ctx.String("mathjax")
        var appPath string = ctx.String("app")

        app(profileName, portNum, appPath, mathJax)
    }

    cmd.Run(os.Args)
}

func exitIfErr(err error, code int) {
    if err != nil {
        fmt.Println(err)
        os.Exit(code)
    }
}

func app(profileName string, portNum int, appPath string, mathJax string) {
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

    db, err = FetchDatabase(profileName)
    exitIfErr(err, 1)

    defer db.CleanUp()

    bootAPI(db, portNum, appPath, mathJax)
}

func norm_score(success int64, fail int64, age int64, times_reviewed int64) float64 {

    var total int64 = success + fail
    var __total float64 = float64(total + 1)
    var __fail float64 = float64(fail)

    // this is Jeffrey-Perks law where h = 0.5
    // References:
    // - http://www.dcs.bbk.ac.uk/~dell/publications/dellzhang_ictir2011.pdf
    // - http://bl.ocks.org/ajschumacher/b9645724d9d842810613
    var lidstone float64 = (__fail + 0.5) / __total

    // - favour cards that are seen less frequently
    // - favour less successful cards
    // - penalize more successful cards
    var bias_factor float64 = (1.0 + __fail) / (__total + float64(success) + float64(times_reviewed)/3.0)

    var base float64 = lidstone + 1.0
    var normalized float64 = lidstone * math.Log(float64(age)*bias_factor+base) / math.Log(base)

    return normalized
}
