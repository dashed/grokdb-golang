const page = require('page');
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const {NOT_SET, paths, dashboard} = require('store/constants');
const {redirectToDeck} = require('store/route');
const superhot = require('store/superhot');
const {generateSlug} = require('store/utils');

// route handler components
const Dashboard = require('components/dashboard');

// TODO: move this into module
const filterInt = function (value) {
    if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        return Number(value);
    }
    return NaN;
};

const bootRouter = co.wrap(function* (store) {
    const rootCursor = store.state();

    /* router setup */

    page('*', function(ctx, next) {

        // reset dashboard state
        rootCursor.cursor(paths.dashboard.decks.editing).update(function() {
            return false;
        });
        rootCursor.cursor(paths.dashboard.decks.creatingNew).update(function() {
            return false;
        });
        rootCursor.cursor(paths.dashboard.decks.finishEditing).update(function() {
            return NOT_SET;
        });

        return next();
    });

    // go to root deck by default
    page('/', function(/*ctx*/) {
        const cursor = rootCursor.cursor(paths.root);

        const handler = function(rootID) {
            page.redirect(`/deck/${rootID}`);
        };

        if(cursor.deref(NOT_SET) === NOT_SET) {
            cursor.once('any', function(rootID) {
                handler(rootID);
            });
            return;
        }

        handler(cursor.deref());
    });

    page('/deck/:id', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(notValidID(maybeID)) {
            page.redirect('/');
            return;
        }

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.decks;
        });

        rootCursor.cursor(paths.route.handler).update(function() {
            return Dashboard;
        });

        const deckCursor = rootCursor.cursor(paths.deck.self);
        const deck = deckCursor.deref(NOT_SET);

        if(deck === NOT_SET) {
            deckCursor.once('any', function(_deck) {
                store.dispatch(redirectToDeck, _deck);
            });
            rootCursor.cursor(paths.route.params.deck.id).update(function() {
                return maybeID;
            });
        } else {

            // deck already loaded in app state; redirect

            store.dispatch(redirectToDeck, deck, maybeID);
        }
    });

    page('/deck/:id/:slug', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(notValidID(maybeID)) {
            page.redirect('/');
            return;
        }

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.decks;
        });

        rootCursor.cursor(paths.route.handler).update(function() {
            return Dashboard;
        });

        const deckCursor = rootCursor.cursor(paths.deck.self);
        const deck = deckCursor.deref(NOT_SET);

        const handler = function(_deck) {

            const slugged = generateSlug(_deck.get('name'), maybeID);

            if(ctx.params.slug == slugged) {
                return;
            }

            page.redirect(`/deck/${maybeID}/${slugged}`);
        };

        if(deck === NOT_SET) {

            deckCursor.once('any', function(_deck) {
                handler(_deck);
            });

            rootCursor.cursor(paths.route.params.deck.id).update(function() {
                return maybeID;
            });
        } else {

            // deck already loaded in app state; ensure proper slug
            handler(deck);
        }
    });

    page('/decksetting/:id', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(notValidID(maybeID)) {
            page.redirect('/');
            return;
        }

        rootCursor.cursor(paths.dashboard.decks.editing).update(function() {
            return true;
        });

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.decks;
        });

        rootCursor.cursor(paths.route.handler).update(function() {
            return Dashboard;
        });

        const deckCursor = rootCursor.cursor(paths.deck.self);
        const deck = deckCursor.deref(NOT_SET);

        if(deck === NOT_SET) {
            rootCursor.cursor(paths.route.params.deck.id).update(function() {
                return maybeID;
            });
        }

        if(deck.get('id') != maybeID) {
            page.redirect('/');
        }

    });

    page('/cards/:id', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(notValidID(maybeID)) {
            page.redirect('/');
            return;
        }

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.cards;
        });

        rootCursor.cursor(paths.route.handler).update(function() {
            return Dashboard;
        });

        const deckCursor = rootCursor.cursor(paths.deck.self);
        const deck = deckCursor.deref(NOT_SET);

        if(deck === NOT_SET) {
            rootCursor.cursor(paths.route.params.deck.id).update(function() {
                return maybeID;
            });
        }

    });

    page.start({
        hashbang: true,
        click: false
    });
});

const bootDecks = co.wrap(function* (store) {
    const rootCursor = store.state();

    // cursors
    const deckCursor = rootCursor.cursor(paths.deck.self);
    const deckIDCursor = rootCursor.cursor(paths.route.params.deck.id);
    const deckID = deckIDCursor.deref(NOT_SET);

    /* observers */

    // watch deck and load children
    deckCursor.cursor('children').observe(co.wrap(function*() {

        const _deckID = deckCursor.cursor('id').deref();

        const children = yield new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${_deckID}/children`)
                .end(function(err, res){

                    // no children
                    if (res.status === 404) {
                        return resolve(Immutable.List());
                    }

                    if (res.status === 200) {
                        resolve(Immutable.fromJS(res.body));
                    }

                    // TODO: error handling
                    reject(err);
                });
        });

        rootCursor.cursor(paths.deck.children).update(function() {
            return children;
        });

    }));

    // breadcrumb setup

    const breadcrumbLoader = co.wrap(function*(currentDeck) {

        let breadcrumb;

        // TODO: error handling
        ({ancestors: breadcrumb} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${currentDeck.get('id')}/ancestors`)
                .end(function(err, res){

                    if (res.status === 404) {
                        return resolve({err: null, ancestors: []});
                    } else if(res.status === 200) {
                        return resolve({err: null, ancestors: res.body});
                    }

                    resolve({err: err, ancestors: []});
                });
        }));

        breadcrumb.push(currentDeck);

        const breadcrumbCursor = rootCursor.cursor(paths.deck.breadcrumb);

        // update tail as necessary
        deckCursor.observe(function(updatedDeck) {
            breadcrumbCursor.update(function(lst) {

                if(lst.size <= 0) {
                    return lst;
                }

                if(lst.last().get('id') == updatedDeck.get('id')) {
                    return lst.set(-1, updatedDeck);
                }
                return lst;
            });
        });

        breadcrumbCursor.update(function() {
            return Immutable.fromJS(breadcrumb);
        });
    });

    const maybeDeck = deckCursor.deref(NOT_SET);
    if(maybeDeck === NOT_SET) {
        deckCursor.once('any', function(currentDeck) {
            breadcrumbLoader(currentDeck);
        });
    } else {
        breadcrumbLoader(maybeDeck);
    }

    // watch :id in route params and load deck

    const deckLoader = co.wrap(function*(_deckID) {

        const currentDeck = yield co(function*() {

            // fetch deck
            const {decksResponse} = yield new Promise(function(resolve) {
                superhot
                    .get(`/decks/${_deckID}`)
                    .end(function(err, res){
                        resolve({decksErr: err, decksResponse: res});
                    });
            });

            if(decksResponse.status != 200) {
                return NOT_SET;
            }

            // TODO: error handling here

            return decksResponse.body;
        });

        if(currentDeck === NOT_SET) {
            page.redirect(`/`);
            return;
        }

        const ImmCurrentDeck = Immutable.fromJS(currentDeck);

        // inject currently viewed deck from REST API into app state
        deckCursor.update(function() {
            return ImmCurrentDeck;
        });
    });

    if(deckID === NOT_SET) {
        deckIDCursor.observe(function(_deckID) {
            deckLoader(_deckID);
        });
    } else {
        deckLoader(deckID);
    }

    /* root deck setup */

    const {response} = yield new Promise(function(resolve) {
        superhot
            .get(`/decks/root`)
            .end(function(err3, res3) {
                resolve({err: err3, response: res3});
            });
    });

    // TODO: error handling. note: 4xx are errors

    // inject root deck id value from REST API into app state
    rootCursor.cursor(paths.root).update(function() {
        return response.body.id;
    });

});

module.exports = function(store) {

    co(function* () {

        // connect to REST API

        yield [
            bootRouter(store),
            bootDecks(store)
        ];
    }).catch(function(err) {
        // TODO: proper error logging
        console.error(err);
        console.error(err.stack);
    });


    return store;
};

/* helpers */

const notValidID = function(id) {
    return (_.isNaN(id) || !Number.isInteger(id) || id <= 0);
};
