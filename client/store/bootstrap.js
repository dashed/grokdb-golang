const page = require('page');
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const {NOT_SET, paths, dashboard} = require('store/constants');
const {loadChildren} = require('store/decks');
const {redirectToDeck} = require('store/route');
const superhot = require('store/superhot');
const {generateSlug} = require('store/utils');

// route handler components
const Dashboard = require('components/dashboard');

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

        rootCursor.cursor(paths.dashboard.cards.creatingNew).update(function() {
            return false;
        });

        return next();
    });

    // go to root deck by default
    page('/', function(/*ctx*/) {
        defaultRoute(rootCursor);
    });

    const __ensureDeckRoute = _.bind(ensureDeckRoute, void 0, store);

    page('/deck/:id', __ensureDeckRoute, function() {
        // should not be here
        defaultRoute(rootCursor);
    });

    page('/deck/:id/:slug', __ensureDeckRoute, function() {
        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.decks;
        });
    });

    page('/deck/:id/:slug/settings', __ensureDeckRoute, function() {

        rootCursor.cursor(paths.dashboard.decks.editing).update(function() {
            return true;
        });

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.decks;
        });
    });

    page('/deck/:id/:slug/cards', __ensureDeckRoute, function() {

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.cards;
        });
    });

    page('/deck/:id/:slug/cards/new', __ensureDeckRoute, function() {

        rootCursor.cursor(paths.dashboard.cards.creatingNew).update(function() {
            return true;
        });

        rootCursor.cursor(paths.dashboard.view).update(function() {
            return dashboard.view.cards;
        });
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

// TODO: move this into module
// parse value to an integer
const filterInt = function (value) {
    if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        return Number(value);
    }
    return NaN;
};

const defaultRoute = function(rootCursor) {
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
};

// boilerplate for:
// - /deck/:id
// - /deck/:id/:slug
const ensureDeckRoute = co.wrap(function* (store, ctx, next) {

    const rootCursor = store.state();

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureDeckRoute used incorrectly');
    }

    const maybeID = filterInt(ctx.params.id);

    // ensure :id is valid
    if(notValidID(maybeID)) {
        defaultRoute(rootCursor);
        return;
    }

    // fetch deck from REST

    const deckCursor = rootCursor.cursor(paths.deck.self);
    let deck = deckCursor.deref(NOT_SET);
    let deckID = deck === NOT_SET ? NOT_SET : deck.get('id', NOT_SET);
    const oldDeckID = deckID;

    if(deck === NOT_SET || deckID === NOT_SET || deckID != maybeID) {

        // fetch deck
        const {decksResponse} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${maybeID}`)
                .end(function(err, res){
                    resolve({decksErr: err, decksResponse: res});
                });
        });

        switch(decksResponse.status) {
        case 404:
            defaultRoute(rootCursor);
            return;
            break;
        case 200:
            // good
            deck = Immutable.fromJS(decksResponse.body);
            deckID = maybeID;
            deckCursor.update(function() {
                return deck;
            });
            break;
        default:
            throw Error('http code not found');
            // TODO: error handling
        }
    }

    // load deck children
    if(oldDeckID === NOT_SET || oldDeckID != deckID) {
        // watch deck and load full decks of children
        store.dispatch(loadChildren, maybeID);
    }

    if(!_.has(ctx.params, 'slug')) {
        // matched /deck/:id
        store.dispatch(redirectToDeck, deck, maybeID);
        return;
    }

    // verify if slug is valid

    const slugged = generateSlug(deck.get('name'), maybeID);

    if(ctx.params.slug != slugged) {
        page.redirect(`/deck/${maybeID}/${slugged}`);
        return;
    }


    // TODO: do this concurrently with below
    rootCursor.cursor(paths.route.handler).update(function() {
        return Dashboard;
    });

    next();
    return;
});
