package main

import (
    // _ "encoding/binary"
    // _ "errors"
    // _ "os"

    // 3rd-party
    "github.com/jmoiron/sqlx" // replacement for "database/sql"
    _ "github.com/mattn/go-sqlite3"
)

func FetchDatabase(name string) (*Database, error) {

    var db *Database = &Database{name: name}

    // if necessary, bootstrap database
    var err error = db.Init()
    if err != nil {
        return nil, err
    }

    return db, nil
}

type Database struct {
    name     string
    filename string
    // dbFilePointer *os.File
    instance *sqlx.DB
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
