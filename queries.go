package main

import (
    "encoding/json"
    "errors"
    "fmt"
    "strings"

    // 3rd-party
    "github.com/jmoiron/sqlx"
)

/* bootstrap */

// re. foreign_keys:
// > Foreign key constraints are disabled by default (for backwards compatibility),
// > so must be enabled separately for each database connection.
const BOOTSTRAP_QUERY string = `
PRAGMA foreign_keys=ON;
`

/* config table */
const SETUP_CONFIG_TABLE_QUERY string = `
CREATE TABLE IF NOT EXISTS Config (
    setting TEXT PRIMARY KEY NOT NULL,
    value TEXT,
    CHECK (setting <> '') /* ensure not empty */
);
`

// input: setting
var FETCH_CONFIG_SETTING_QUERY = (func() PipeInput {
    const __FETCH_CONFIG_SETTING_QUERY string = `
    SELECT setting, value FROM Config WHERE setting = :setting;
    `

    var requiredInputCols []string = []string{"setting"}

    return composePipes(
        MakeCtxMaker(__FETCH_CONFIG_SETTING_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// input: setting, value
var INSERT_CONFIG_SETTING_QUERY = (func() PipeInput {
    const __INSERT_CONFIG_SETTING_QUERY string = `
    INSERT OR REPLACE INTO Config(setting, value) VALUES (:setting, :value);
    `

    var requiredInputCols []string = []string{"setting", "value"}

    return composePipes(
        MakeCtxMaker(__INSERT_CONFIG_SETTING_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// input: setting, value
var UPDATE_CONFIG_SETTING_QUERY = (func() PipeInput {
    const __UPDATE_CONFIG_SETTING_QUERY string = `
    UPDATE Config
    SET value = :value
    WHERE setting = :setting;
    `

    var requiredInputCols []string = []string{"setting", "value"}

    return composePipes(
        MakeCtxMaker(__UPDATE_CONFIG_SETTING_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

/* decks table */
const SETUP_DECKS_TABLE_QUERY string = `
CREATE TABLE IF NOT EXISTS Decks (
    deck_id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    CHECK (name <> '') /* ensure not empty */
);

/* closure table and associated triggers for Decks */

CREATE TABLE IF NOT EXISTS DecksClosure (
    ancestor INTEGER NOT NULL,
    descendent INTEGER NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY(ancestor, descendent),
    FOREIGN KEY (ancestor) REFERENCES Decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (descendent) REFERENCES Decks(deck_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS DecksClosure_Index ON DecksClosure (depth DESC);

CREATE TRIGGER IF NOT EXISTS decks_closure_new_deck AFTER INSERT
ON Decks
BEGIN
    INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth) VALUES (NEW.deck_id, NEW.deck_id, 0);
END;
`

var CREATE_NEW_DECK_QUERY = (func() PipeInput {
    const __CREATE_NEW_DECK_QUERY string = `
    INSERT INTO Decks(name) VALUES (:name);
    `
    var requiredInputCols []string = []string{"name"}

    return composePipes(
        MakeCtxMaker(__CREATE_NEW_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var FETCH_DECK_QUERY = (func() PipeInput {
    const __FETCH_DECK_QUERY string = `
    SELECT deck_id, name, description FROM Decks WHERE deck_id = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__FETCH_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var UPDATE_DECK_QUERY = (func() PipeInput {
    const __UPDATE_DECK_QUERY string = `
    UPDATE Decks
    SET
    %s
    WHERE deck_id = :deck_id
    `

    var requiredInputCols []string = []string{"deck_id"}
    var whiteListCols []string = []string{"name", "description"}

    return composePipes(
        MakeCtxMaker(__UPDATE_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        PatchFilterPipe(whiteListCols),
        BuildQueryPipe,
    )
}())

var DELETE_DECK_QUERY = (func() PipeInput {
    const __DELETE_DECK_QUERY string = `
    DELETE FROM Decks WHERE deck_id = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__DELETE_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// decks closure queries

// params:
// ?1 := parent
// ?2 := child
var ASSOCIATE_DECK_AS_CHILD_QUERY = (func() PipeInput {
    const __ASSOCIATE_DECK_AS_CHILD_QUERY string = `
    INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth)

    /* for every ancestor of parent, make it an ancestor of child */
    SELECT t.ancestor, :child, t.depth+1
    FROM DecksClosure AS t
    WHERE t.descendent = :parent

    UNION ALL

    /* child is an ancestor of itself with a depth of 0 */
    SELECT :child, :child, 0;
    `

    var requiredInputCols []string = []string{"parent", "child"}

    return composePipes(
        MakeCtxMaker(__ASSOCIATE_DECK_AS_CHILD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// let :child be the subtree being moved
// let :parent be the new parent for :child
//
// moving a deck subtree consists of two procedures:
// 1. delete the subtree connections
var SPLICE_DECK_SUBTREE_DELETE_QUERY = (func() PipeInput {
    const __SPLICE_DECK_SUBTREE_DELETE_QUERY string = `
    DELETE FROM DecksClosure

    /* select all descendents of child */
    WHERE descendent IN (
        SELECT descendent
        FROM DecksClosure
        WHERE ancestor = :child
    )
    AND

    /* select all ancestors of child but not child itself */
    ancestor IN (
        SELECT ancestor
        FROM DecksClosure
        WHERE descendent = :child
        AND ancestor != descendent
    );
    `

    var requiredInputCols []string = []string{"child"}

    return composePipes(
        MakeCtxMaker(__SPLICE_DECK_SUBTREE_DELETE_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var SPLICE_DECK_SUBTREE_ADD_QUERY = (func() PipeInput {
    const __SPLICE_DECK_SUBTREE_ADD_QUERY string = `
    INSERT OR IGNORE INTO DecksClosure(ancestor, descendent, depth)
    SELECT p.ancestor, c.descendent, p.depth+c.depth+1
    FROM DecksClosure AS p, DecksClosure AS c
    WHERE
    p.descendent = :parent
    AND c.ancestor = :child;
    `

    var requiredInputCols []string = []string{"child", "parent"}

    return composePipes(
        MakeCtxMaker(__SPLICE_DECK_SUBTREE_ADD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// fetch direct children
var DECK_CHILDREN_QUERY = (func() PipeInput {
    const __DECK_CHILDREN_QUERY string = `
    SELECT ancestor, descendent, depth
    FROM DecksClosure
    WHERE
    ancestor = :parent
    AND depth = 1;
    `

    var requiredInputCols []string = []string{"parent"}

    return composePipes(
        MakeCtxMaker(__DECK_CHILDREN_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// test lineage
var TEST_LINEAGE_QUERY = (func() PipeInput {
    const __TEST_LINEAGE_QUERY string = `
    SELECT COUNT(1)
    FROM DecksClosure
    WHERE
    ancestor = :parent
    AND
    descendent = :descendent
    LIMIT 1;
    `

    var requiredInputCols []string = []string{"parent", "descendent"}

    return composePipes(
        MakeCtxMaker(__TEST_LINEAGE_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// fetch direct parent (if any)
var DECK_PARENT_QUERY = (func() PipeInput {
    const __DECK_PARENT_QUERY string = `
    SELECT ancestor, descendent, depth
    FROM DecksClosure
    WHERE
    descendent = :child
    AND depth = 1;
    `

    var requiredInputCols []string = []string{"child"}

    return composePipes(
        MakeCtxMaker(__DECK_PARENT_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// ancestors from farthest to nearest
var DECK_ANCESTORS_QUERY = (func() PipeInput {
    const __DECK_ANCESTORS_QUERY string = `
    SELECT ancestor, descendent, depth
    FROM DecksClosure
    WHERE
    descendent = :child
    AND depth > 0
    ORDER BY depth DESC;
    `

    var requiredInputCols []string = []string{"child"}

    return composePipes(
        MakeCtxMaker(__DECK_ANCESTORS_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

/* cards table */
const SETUP_CARDS_TABLE_QUERY string = `
CREATE TABLE IF NOT EXISTS Cards (
    card_id INTEGER PRIMARY KEY NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    front TEXT NOT NULL DEFAULT '',

    back TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')), /* note: time when the card was modified. not when it was seen. */

    deck INTEGER NOT NULL,

    CHECK (title <> ''), /* ensure not empty */
    FOREIGN KEY (deck) REFERENCES Decks(deck_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS cards_updated_card AFTER UPDATE OF
title, description, front, back, deck
ON Cards
BEGIN
    UPDATE Cards SET updated_at = strftime('%s', 'now') WHERE card_id = NEW.card_id;
END;

CREATE INDEX IF NOT EXISTS Cards_Index ON Cards (deck);


CREATE VIRTUAL TABLE IF NOT EXISTS CardsFTS USING fts3(title TEXT, description TEXT, front TEXT, back TEXT);

CREATE TRIGGER IF NOT EXISTS first_index_card_fts AFTER INSERT
ON Cards
BEGIN
    INSERT OR REPLACE INTO CardsFTS(docid, title, description, front, back) VALUES (NEW.card_id, NEW.title, NEW.description, NEW.front, NEW.back);
END;

CREATE TRIGGER IF NOT EXISTS deleted_card_cardfts AFTER DELETE
ON Cards
BEGIN
    DELETE FROM CardsFTS WHERE docid=OLD.card_id;
END;

CREATE TRIGGER IF NOT EXISTS not_first_index_card_fts AFTER UPDATE OF
title, description, front, back, deck
ON Cards
BEGIN
    INSERT OR REPLACE INTO CardsFTS(docid, title, description, front, back) VALUES (NEW.card_id, NEW.title, NEW.description, NEW.front, NEW.back);
END;

CREATE TABLE IF NOT EXISTS CardsScore (
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    score REAL NOT NULL DEFAULT 0.5, /* jeffrey-perks law */
    times_reviewed INT NOT NULL DEFAULT 0,
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    changelog TEXT NOT NULL DEFAULT '', /* internal for CardsScoreHistory to take snapshot of */

    card INTEGER NOT NULL,

    PRIMARY KEY(card),

    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS cardsscore_new_score AFTER INSERT
ON Cards
BEGIN
    INSERT OR IGNORE INTO CardsScore(card) VALUES (NEW.card_id);
END;

CREATE TRIGGER IF NOT EXISTS cardsscore_updated_score AFTER UPDATE OF success, fail, score
ON CardsScore
BEGIN
    UPDATE CardsScore SET updated_at = strftime('%s', 'now') WHERE card = NEW.card;
END;

/* enforce 1-1 relationship */
CREATE UNIQUE INDEX IF NOT EXISTS CardsScore_Index ON CardsScore (card);
CREATE INDEX IF NOT EXISTS CardsScoreHistory_date_Index ON CardsScore (score DESC);

CREATE TABLE IF NOT EXISTS CardsScoreHistory (
    occured_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    success INTEGER NOT NULL DEFAULT 0,
    fail INTEGER NOT NULL DEFAULT 0,
    score REAL NOT NULL DEFAULT 0.5, /* jeffrey-perks law */
    changelog TEXT NOT NULL DEFAULT '', /* internal for CardsScoreHistory to take snapshot of */
    card INTEGER NOT NULL,

    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS record_cardscore AFTER UPDATE
OF success, fail, score, changelog
ON CardsScore
BEGIN
   INSERT INTO CardsScoreHistory(occured_at, success, fail, score, changelog, card)
   VALUES (strftime('%s', 'now'), NEW.success, NEW.fail, NEW.score, NEW.changelog, NEW.card);
END;

CREATE INDEX IF NOT EXISTS CardsScoreHistory_relation_Index ON CardsScoreHistory (card);
CREATE INDEX IF NOT EXISTS CardsScoreHistory_date_Index ON CardsScoreHistory (occured_at DESC);

CREATE TABLE IF NOT EXISTS ReviewCardCache (
    deck INTEGER NOT NULL,
    card INTEGER NOT NULL,
    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY(deck),

    FOREIGN KEY (deck) REFERENCES Decks(deck_id) ON DELETE CASCADE,
    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);
`

var CREATE_NEW_CARD_QUERY = (func() PipeInput {
    const __CREATE_NEW_CARD_QUERY string = `
    INSERT INTO Cards(title, description, front, back, deck)
    VALUES (:title, :description, :front, :back, :deck);
    `
    var requiredInputCols []string = []string{
        "title",
        "description",
        "front",
        "back",
        "deck",
    }

    return composePipes(
        MakeCtxMaker(__CREATE_NEW_CARD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var DELETE_CARD_QUERY = (func() PipeInput {
    const __DELETE_CARD_QUERY string = `
    DELETE FROM Cards WHERE card_id = :card_id;
    `

    var requiredInputCols []string = []string{"card_id"}

    return composePipes(
        MakeCtxMaker(__DELETE_CARD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var FETCH_CARD_QUERY = (func() PipeInput {
    const __FETCH_CARD_QUERY string = `
    SELECT card_id, title, description, front, back, deck, created_at, updated_at FROM Cards
    WHERE card_id = :card_id;
    `

    var requiredInputCols []string = []string{"card_id"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var UPDATE_CARD_QUERY = (func() PipeInput {
    const __UPDATE_CARD_QUERY string = `
    UPDATE Cards
    SET
    %s
    WHERE card_id = :card_id
    `

    var requiredInputCols []string = []string{"card_id"}
    var whiteListCols []string = []string{
        "title",
        "description",
        "front",
        "back",
        "deck",
    }

    return composePipes(
        MakeCtxMaker(__UPDATE_CARD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        PatchFilterPipe(whiteListCols),
        BuildQueryPipe,
    )
}())

var COUNT_CARDS_BY_DECK_QUERY = (func() PipeInput {
    const __COUNT_CARDS_BY_DECK_QUERY string = `
        SELECT
            COUNT(1)
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        WHERE dc.ancestor = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__COUNT_CARDS_BY_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

// sort by created_at
var FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY = func(sort string) PipeInput {
    const __FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY_RAW string = `
        SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        WHERE
        c.oid NOT IN (
            SELECT
                c.oid
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            WHERE dc.ancestor = :deck_id
            ORDER BY c.created_at %s LIMIT :offset
        )
        AND
        dc.ancestor = :deck_id
        ORDER BY c.created_at %s LIMIT :per_page;
    `

    var __FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY string = fmt.Sprintf(__FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY_RAW, sort, sort)

    var requiredInputCols []string = []string{"deck_id", "offset", "per_page"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARDS_BY_DECK_SORT_CREATED_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}

// sort by updated_at
var FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY = func(sort string) PipeInput {
    const __FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY_RAW string = `
        SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        WHERE
        c.oid NOT IN (
            SELECT
                c.oid
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            WHERE dc.ancestor = :deck_id
            ORDER BY c.updated_at %s LIMIT :offset
        )
        AND
        dc.ancestor = :deck_id
        ORDER BY c.updated_at %s LIMIT :per_page;
    `

    var __FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY string = fmt.Sprintf(__FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY_RAW, sort, sort)

    var requiredInputCols []string = []string{"deck_id", "offset", "per_page"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARDS_BY_DECK_SORT_UPDATED_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}

// sort by title
var FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY = func(sort string) PipeInput {
    const __FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY_RAW string = `
        SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        WHERE
        c.oid NOT IN (
            SELECT
                c.oid
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            WHERE dc.ancestor = :deck_id
            ORDER BY c.title %s LIMIT :offset
        )
        AND
        dc.ancestor = :deck_id
        ORDER BY c.title %s LIMIT :per_page;
    `

    var __FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY string = fmt.Sprintf(__FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY_RAW, sort, sort)

    var requiredInputCols []string = []string{"deck_id", "offset", "per_page"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARDS_BY_DECK_SORT_TITLE_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}

// sort by reviewed date
var FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY = func(sort string) PipeInput {
    const __FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY_RAW string = `
        SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        INNER JOIN CardsScore AS cs
        ON cs.card = c.card_id

        WHERE
        c.oid NOT IN (
            SELECT
                c.oid
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE dc.ancestor = :deck_id
            ORDER BY cs.updated_at %s LIMIT :offset
        )
        AND
        dc.ancestor = :deck_id
        ORDER BY cs.updated_at %s LIMIT :per_page;
    `

    var __FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY string = fmt.Sprintf(__FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY_RAW, sort, sort)

    var requiredInputCols []string = []string{"deck_id", "offset", "per_page"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARDS_BY_DECK_REVIEWED_DATE_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}

// sort by times reviewed
var FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY = func(sort string) PipeInput {
    const __FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY_RAW string = `
        SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        INNER JOIN CardsScore AS cs
        ON cs.card = c.card_id

        WHERE
        c.oid NOT IN (
            SELECT
                c.oid
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE dc.ancestor = :deck_id
            ORDER BY cs.times_reviewed %s LIMIT :offset
        )
        AND
        dc.ancestor = :deck_id
        ORDER BY cs.times_reviewed %s LIMIT :per_page;
    `

    var __FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY string = fmt.Sprintf(__FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY_RAW, sort, sort)

    var requiredInputCols []string = []string{"deck_id", "offset", "per_page"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARDS_BY_DECK_TIMES_REVIEWED_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}

var FETCH_CARD_SCORE = (func() PipeInput {
    const __FETCH_CARD_SCORE string = `
    SELECT success, fail, score, times_reviewed, updated_at, card FROM CardsScore
    WHERE card = :card_id
    LIMIT 1;
    `

    var requiredInputCols []string = []string{"card_id"}

    return composePipes(
        MakeCtxMaker(__FETCH_CARD_SCORE),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var COUNT_REVIEW_CARDS_BY_DECK = (func() PipeInput {
    const __COUNT_REVIEW_CARDS_BY_DECK string = `
        SELECT
            COUNT(1)
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        WHERE dc.ancestor = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__COUNT_REVIEW_CARDS_BY_DECK),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_AGE = (func() PipeInput {
    const __FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_AGE string = `
        SELECT
        c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at
        FROM DecksClosure AS dc

        INNER JOIN Cards AS c
        ON c.deck = dc.descendent

        INNER JOIN CardsScore AS cs
        ON cs.card = c.card_id

        WHERE
            dc.ancestor = :deck_id
        ORDER BY
            (strftime('%s','now') - cs.updated_at) DESC
        LIMIT :purgatory_size
        OFFSET :purgatory_index;
    `
    /* should range from 0 to purgatory_size-1 */

    var requiredInputCols []string = []string{"deck_id", "purgatory_size", "purgatory_index"}

    return composePipes(
        MakeCtxMaker(__FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_AGE),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var FETCH_NEXT_REVIEW_CARD_BY_DECK_ORDER_BY_NORM_SCORE = (func() PipeInput {
    const __FETCH_NEXT_REVIEW_CARD_BY_DECK string = `
        SELECT
        sub.card_id, sub.title, sub.description, sub.front, sub.back, sub.deck, sub.created_at, sub.updated_at
        FROM (
            SELECT
            c.card_id, c.title, c.description, c.front, c.back, c.deck, c.created_at, c.updated_at,
            cs.success, cs.fail, cs.updated_at AS cs_updated_at
            FROM DecksClosure AS dc

            INNER JOIN Cards AS c
            ON c.deck = dc.descendent

            INNER JOIN CardsScore AS cs
            ON cs.card = c.card_id

            WHERE
                dc.ancestor = :deck_id
            ORDER BY
                (strftime('%s','now') - cs.updated_at) DESC
            LIMIT :purgatory_size
        )
        AS sub
        LIMIT 1
        OFFSET :purgatory_index;
    `
    /* should range from 0 to purgatory_size-1 */

    var requiredInputCols []string = []string{"deck_id", "purgatory_size", "purgatory_index"}

    return composePipes(
        MakeCtxMaker(__FETCH_NEXT_REVIEW_CARD_BY_DECK),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var UPDATE_CARD_SCORE_QUERY = (func() PipeInput {
    const __UPDATE_CARD_SCORE_QUERY string = `
    UPDATE CardsScore
    SET
    %s
    WHERE card = :card_id
    `

    var requiredInputCols []string = []string{"card_id"}

    // note: only set "updated_at" when not setting any other cols; allows user
    // to skip cards
    var whiteListCols []string = []string{"success", "fail", "score", "updated_at", "changelog", "times_reviewed"}

    return composePipes(
        MakeCtxMaker(__UPDATE_CARD_SCORE_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        PatchFilterPipe(whiteListCols),
        BuildQueryPipe,
    )
}())

var GET_CACHED_REVIEWCARD_BY_DECK_QUERY = (func() PipeInput {
    const __GET_CACHED_REVIEWCARD_BY_DECK_QUERY string = `
        SELECT deck, card, created_at FROM ReviewCardCache
        WHERE deck = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__GET_CACHED_REVIEWCARD_BY_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var DELETE_CACHED_REVIEWCARD_BY_DECK_QUERY = (func() PipeInput {
    const __DELETE_CACHED_REVIEWCARD_BY_DECK_QUERY string = `
    DELETE FROM ReviewCardCache WHERE deck = :deck_id;
    `

    var requiredInputCols []string = []string{"deck_id"}

    return composePipes(
        MakeCtxMaker(__DELETE_CACHED_REVIEWCARD_BY_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var DELETE_CACHED_REVIEWCARD_QUERY = (func() PipeInput {
    const __DELETE_CACHED_REVIEWCARD_QUERY string = `
    DELETE FROM ReviewCardCache WHERE card = :card_id;
    `

    var requiredInputCols []string = []string{"card_id"}

    return composePipes(
        MakeCtxMaker(__DELETE_CACHED_REVIEWCARD_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

var INSERT_CACHED_REVIEWCARD_BY_DECK_QUERY = (func() PipeInput {
    const __INSERT_CACHED_REVIEWCARD_BY_DECK_QUERY string = `
    INSERT INTO ReviewCardCache(deck, card) VALUES (:deck_id, :card_id);
    `
    var requiredInputCols []string = []string{"deck_id", "card_id"}

    return composePipes(
        MakeCtxMaker(__INSERT_CACHED_REVIEWCARD_BY_DECK_QUERY),
        EnsureInputColsPipe(requiredInputCols),
        BuildQueryPipe,
    )
}())

/* review cards table */

const BINS_TABLE_QUERY string = `

CREATE TABLE IF NOT EXISTS Bins (
    bin_id INTEGER PRIMARY KEY NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    created_at INT NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INT NOT NULL DEFAULT (strftime('%s', 'now')), /* note: time when the bin was modified. not when it was reviewed. */

    CHECK (title <> '') /* ensure not empty */
);

CREATE TABLE IF NOT EXISTS BinCards (

    bin INTEGER NOT NULL,
    card INTEGER NOT NULL,

    added_at INT NOT NULL DEFAULT (strftime('%s', 'now')),

    PRIMARY KEY(bin, card),

    FOREIGN KEY (bin) REFERENCES Bins(bin_id) ON DELETE CASCADE,
    FOREIGN KEY (card) REFERENCES Cards(card_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS bin_updated_trigger AFTER UPDATE OF
title, description
ON Bins
BEGIN
    UPDATE Bins SET updated_at = strftime('%s', 'now') WHERE bin_id = NEW.bin_id;
END;

`

/* helpers */

func JSON2Map(rawJSON []byte) (*StringMap, error) {

    var newMap StringMap

    err := json.Unmarshal(rawJSON, &newMap)
    if err != nil {
        return nil, err
    }

    return &newMap, nil
}

type StringMap map[string]interface{}

type QueryContext struct {
    query    string
    nameArgs *StringMap
    args     []interface{}
}

func MakeCtxMaker(_baseQuery string) func() *QueryContext {

    var baseQuery string = "PRAGMA foreign_keys=ON; " + _baseQuery

    return func() *QueryContext {
        var ctx QueryContext
        ctx.query = baseQuery
        ctx.nameArgs = &(StringMap{})

        return &ctx
    }
}

type PipeInput func(...interface{}) (*QueryContext, PipeInput, error)
type Pipe func(*QueryContext, *([]Pipe)) PipeInput

// TODO: rename to waterfallPipes; since this isn't really an actual compose operation
func composePipes(makeCtx func() *QueryContext, pipes ...Pipe) PipeInput {

    if len(pipes) <= 0 {
        return func(args ...interface{}) (*QueryContext, PipeInput, error) {
            // noop
            return nil, nil, nil
        }
    }

    var firstPipe Pipe = pipes[0]
    var restPipes []Pipe = pipes[1:]
    return func(args ...interface{}) (*QueryContext, PipeInput, error) {
        return firstPipe(makeCtx(), &restPipes)(args...)
    }
}

func EnsureInputColsPipe(required []string) Pipe {
    return func(ctx *QueryContext, pipes *([]Pipe)) PipeInput {
        return func(args ...interface{}) (*QueryContext, PipeInput, error) {

            var (
                inputMap *StringMap = args[0].(*StringMap)
                nameArgs *StringMap = (*ctx).nameArgs
            )

            for _, col := range required {
                value, exists := (*inputMap)[col]

                if !exists {
                    return nil, nil, errors.New(fmt.Sprintf("missing required col: %s\nfor query: %s", col, ctx.query))
                }

                (*nameArgs)[col] = value
            }

            nextPipe := (*pipes)[0]
            restPipes := (*pipes)[1:]

            return ctx, nextPipe(ctx, &restPipes), nil
        }
    }
}

// given whitelist of cols and an unmarshaled json map, construct update query fragment
// for updating value of cols
func PatchFilterPipe(whitelist []string) Pipe {
    return func(ctx *QueryContext, pipes *([]Pipe)) PipeInput {
        return func(args ...interface{}) (*QueryContext, PipeInput, error) {

            var (
                patch           *StringMap = args[0].(*StringMap)
                namedSetStrings []string   = make([]string, 0, len(whitelist))
                nameArgs        *StringMap = (*ctx).nameArgs
                patched         bool       = false
            )

            for _, col := range whitelist {
                value, exists := (*patch)[col]

                if exists {
                    (*nameArgs)[col] = value
                    patched = true

                    setstring := fmt.Sprintf("%s = :%s", col, col)
                    namedSetStrings = append(namedSetStrings, setstring)
                }
            }

            if !patched {
                return nil, nil, errors.New("nothing patched")
            }

            (*ctx).query = fmt.Sprintf((*ctx).query, strings.Join(namedSetStrings, ", "))

            nextPipe := (*pipes)[0]
            restPipes := (*pipes)[1:]

            return ctx, nextPipe(ctx, &restPipes), nil
        }
    }
}

func BuildQueryPipe(ctx *QueryContext, _ *([]Pipe)) PipeInput {
    return func(args ...interface{}) (*QueryContext, PipeInput, error) {

        // this apparently doesn't work
        // var nameArgs StringMap = *((*ctx).nameArgs)
        var nameArgs map[string]interface{} = *((*ctx).nameArgs)

        query, args, err := sqlx.Named((*ctx).query, nameArgs)

        if err != nil {
            return nil, nil, err
        }

        ctx.query = query
        ctx.args = args

        return ctx, nil, nil
    }
}

func QueryApply(pipe PipeInput, stringmaps ...*StringMap) (string, []interface{}, error) {

    var (
        err         error
        currentPipe PipeInput = pipe
        ctx         *QueryContext
        idx         int = 0
    )

    for currentPipe != nil {

        var args []interface{} = []interface{}{}

        if idx < len(stringmaps) {
            args = append(args, stringmaps[idx])
            idx++
        }

        ctx, currentPipe, err = currentPipe(args...)
        if err != nil {
            return "", nil, err
        }
    }

    if ctx != nil {
        return ctx.query, ctx.args, nil
    }

    return "", nil, nil
}
