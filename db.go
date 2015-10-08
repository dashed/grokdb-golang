package main

import (
    // _ "encoding/binary"
    // _ "errors"
    // _ "os"
    "database/sql"
    "math"
    "sync"

    // 3rd-party
    "github.com/jmoiron/sqlx" // replacement for "database/sql"
    sqlite "github.com/mattn/go-sqlite3"
)

type Database struct {
    name       string
    filename   string
    instance   *sqlx.DB
    sqliteConn *sqlite.SQLiteConn
    // dbFilePointer *os.File // used for data syncing. (wip)
}

var once sync.Once
var mutex = &sync.Mutex{}
var sqlite3Conn *sqlite.SQLiteConn

func FetchDatabase(name string) (*Database, error) {

    mutex.Lock()

    once.Do(func() {
        // adapted from: https://github.com/mattn/go-sqlite3/blob/master/_example/custom_func/main.go
        sql.Register("sqlite3_custom", &sqlite.SQLiteDriver{
            ConnectHook: func(conn *sqlite.SQLiteConn) error {

                // register custom user defined function.
                // this calculates the normalized score of a card with respect to its
                // metadata attributes.
                if err := conn.RegisterFunc("norm_score", norm_score, true); err != nil {
                    return err
                }

                // source: https://github.com/mattn/go-sqlite3/issues/104#issuecomment-33213801
                sqlite3Conn = conn

                return nil
            },
        })
    })

    var db *Database = &Database{name: name}

    // if necessary, bootstrap database
    var err error = db.Init()
    if err != nil {
        return nil, err
    }

    db.sqliteConn = sqlite3Conn
    sqlite3Conn = nil

    mutex.Unlock()

    return db, nil
}

func (db *Database) Init() error {

    var err error

    db.NormalizeFileName()

    db.instance, err = sqlx.Connect("sqlite3_custom", db.filename)
    if err != nil {
        return err
    }

    // TODO: remove if no longer needed
    // db.dbFilePointer, err = os.Open(db.filename)
    // if err != nil {
    //     return err
    // }

    // set up connection and create any necessary tables

    var queries []string = []string{
        BOOTSTRAP_QUERY,
        SETUP_CONFIG_TABLE_QUERY,
        SETUP_DECKS_TABLE_QUERY,
        SETUP_CARDS_TABLE_QUERY,
        STASHES_TABLE_QUERY,
    }

    var instance = db.instance

    for _, query := range queries {

        // TODO: run queries in transaction??

        _, err = instance.Exec(query)
        if err != nil {
            return err
        }
    }

    return nil
}

func (db *Database) NormalizeFileName() {

    // TODO: be able to set any filename
    // TODO: check if db.filename needs to be populated

    db.filename = db.name + ".db"
}

func (db *Database) CleanUp() {
    // db.dbFilePointer.Close()
    db.instance.Close()
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

// func (db *Database) Counter() (uint32, error) {

//     // get file change counter for sqlite file.
//     // useful to get somthing akin to a 'checksum' of the db
//     // reference: http://www.sqlite.org/fileformat.html

//     fptr := db.dbFilePointer

//     // seek to byte offset of 24
//     _, err := fptr.Seek(24, 0)
//     if err != nil {
//         return 0, err
//     }

//     b2 := make([]byte, 4)
//     bytesRead, err := fptr.Read(b2)
//     if err != nil {
//         return 0, err
//     }
//     if bytesRead != 4 {
//         // TODO: display db's filename
//         return 0, errors.New("Unable to read database")
//     }

//     // The file change counter is a 4-byte big-endian integer
//     counter := binary.BigEndian.Uint32(b2)

//     return counter, nil
// }
