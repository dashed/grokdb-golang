package main

import (
    "errors"
    "fmt"
    "os"

    // 3rd-party
    "github.com/codegangsta/cli"
)

func main() {

    // let do this! ᕕ( ᐛ )ᕗ

    // override the default cli help template
    cli.AppHelpTemplate = helpTemplate

    var cmd *cli.App = cli.NewApp()

    cmd.Name = "wunderfoo"
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
