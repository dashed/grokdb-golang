const page = require('page');
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');
const qs = require('qs');

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

        // begin state change transaction
        rootCursor.cursor(paths.transaction).update(function() {
            return Immutable.Map().withMutations(function(map) {
                map
                    // decks
                    .set(paths.dashboard.decks.editing, false)
                    .set(paths.dashboard.decks.creatingNew, false)
                    .set(paths.dashboard.decks.finishEditing, NOT_SET)

                    // cards
                    .set(paths.dashboard.cards.creatingNew, false)
                    .set(paths.dashboard.cards.page, 1)
                    .set(paths.dashboard.cards.viewingProfile, false);
            });
        });

        return next();
    });

    // go to root deck by default
    page('/', function(/*ctx*/) {
        defaultRoute(rootCursor);
    });

    const __commitStateTransaction = _.bind(commitStateTransaction, void 0, store);
    const __ensureDeckRoute = _.bind(ensureDeckRoute, void 0, store);
    const __ensureCardsRoute = _.bind(ensureCardsRoute, void 0, store);
    const __ensureCurrentCardRoute = _.bind(ensureCurrentCardRoute, void 0, store);
    const __ensureDeckReviewRoute = _.bind(ensureDeckReviewRoute, void 0, store);

    page('/deck/:id', __ensureDeckRoute, function() {
        // should not be here
        defaultRoute(rootCursor);
    });

    page('/deck/:id/:slug', __ensureDeckRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map.set(paths.dashboard.view, dashboard.view.decks);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/settings', __ensureDeckRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.decks)
                    .set(paths.dashboard.decks.editing, true);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/cards', __ensureDeckRoute, __ensureCardsRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.cards);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/cards/new', __ensureDeckRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.cards.creatingNew, true)
                    .set(paths.dashboard.view, dashboard.view.cards);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/card/:id', __ensureCurrentCardRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.card.editing, false)
                    .set(paths.dashboard.cards.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.cards);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/card/:id/edit', __ensureCurrentCardRoute, function(ctx, next) {
        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.card.editing, true)
                    .set(paths.dashboard.cards.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.cards);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/review/deck/:id', __ensureDeckReviewRoute, function(ctx, next) {

        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.review);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/review/card/:id', function(ctx, next) {

        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.review);
            });
        });

        return next();
    }, __commitStateTransaction);

    page.start({
        hashbang: true,
        click: false
    });
});

const bootDecks = co.wrap(function* (store) {
    const rootCursor = store.state();

    // cursors
    const deckCursor = rootCursor.cursor(paths.deck.self);

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

const commitStateTransaction = function(store) {
    const rootCursor = store.state();

    const transaction = rootCursor.cursor(paths.transaction).deref(Immutable.Map());

    transaction.forEach(function(value, path) {
        rootCursor.cursor(path).update(function() {
            return value;
        });
    });
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
    const oldDeckID = deckID; // ensure old value of deckID is 'correct'

    if(deck === NOT_SET || deckID === NOT_SET || deckID != maybeID) {

        deck = yield loadDeck(maybeID, NOT_SET);

        if(deck === NOT_SET) {
            // 404
            defaultRoute(rootCursor);
            return;
        }

        deckID = maybeID;

        rootCursor.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map.set(paths.deck.self, deck);
            });
        });
    }

    // load deck children
    const children = rootCursor.cursor(paths.deck.children).deref(NOT_SET);
    if(children === NOT_SET || oldDeckID === NOT_SET || oldDeckID != deckID) {
        // watch deck and load full decks of children
        store.invoke(loadChildren, {deckID: maybeID});
    }

    if(!_.has(ctx.params, 'slug')) {
        // matched /deck/:id
        store.invoke(redirectToDeck, {deck, deckID: maybeID});
        return;
    }

    // verify if slug is valid

    const slugged = generateSlug(deck.get('name'), maybeID);

    if(ctx.params.slug != slugged) {
        page.redirect(`/deck/${maybeID}/${slugged}`);
        return;
    }

    rootCursor.cursor(paths.transaction).update(function(map) {
        return map.withMutations(function(__map) {
            __map.set(paths.route.handler, Dashboard);
        });
    });

    next();
    return;
});

const ensureCurrentCardRoute = co.wrap(function* (store, ctx, next) {

    const rootCursor = store.state();

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureCurrentCardRoute used incorrectly');
    }

    const maybeID = filterInt(ctx.params.id);

    // ensure :id is valid
    if(notValidID(maybeID)) {
        defaultRoute(rootCursor);
        return;
    }

    // fetch card from REST

    const cardCursor = rootCursor.cursor(paths.card.self);
    let card = cardCursor.deref(NOT_SET);
    let cardID = card === NOT_SET ? NOT_SET : card.get('id', NOT_SET);
    // const oldCardID = cardID; // ensure old value of cardID is 'correct'

    if(card === NOT_SET || cardID === NOT_SET || cardID != maybeID) {

        // fetch card
        const {response} = yield new Promise(function(resolve) {
            superhot
                .get(`/cards/${maybeID}`)
                .end(function(err, res){
                    // TODO: error handling
                    resolve({err: err, response: res});
                });
        });

        switch(response.status) {
        case 404:
            defaultRoute(rootCursor);
            return;
            break;
        case 200:
            // good
            card = Immutable.fromJS(response.body);
            cardID = maybeID;

            rootCursor.cursor(paths.transaction).update(function(map) {
                return map.withMutations(function(__map) {
                    __map.set(paths.card.self, card);
                });
            });
            break;
        default:
            throw Error('http code not found');
            // TODO: error handling
        }
    }

    // fetch deck
    const deck = yield loadDeck(card.get('deck'), NOT_SET);

    if(deck === NOT_SET) {
        // 404
        defaultRoute(rootCursor);
        return;
    }

    // load deck onto app state
    rootCursor.cursor(paths.transaction).update(function(map) {
        return map.withMutations(function(__map) {
            __map.set(paths.deck.self, deck);
        });
    });

    // load cards list
    co(function*() {
        yield loadCardsList(rootCursor, deck.get('id'));
    });

    rootCursor.cursor(paths.transaction).update(function(map) {
        return map.withMutations(function(__map) {
            __map.set(paths.route.handler, Dashboard);
        });
    });

    next();
    return;
});

const ensureCardsRoute = co.wrap(function* (store, ctx, next) {

    const rootCursor = store.state();

    const queries = qs.parse(ctx.querystring);

    // parse page query param
    const pageNum = (function() {
        if(_.has(queries, 'page')) {
            const _pageNum = filterInt(queries.page);
            return _pageNum <= 0 ? 1 : _pageNum;
        }
        return 1;
    }());

    // fetch deck id from transaction

    const deckID = (function() {
        let maybeDeck = rootCursor.cursor(paths.transaction).deref().get(paths.deck.self, NOT_SET);

        if(maybeDeck === NOT_SET) {
            maybeDeck = rootCursor.cursor(paths.deck.self).deref(NOT_SET);

            if(maybeDeck === NOT_SET) {
                // TODO: error handling
                throw Error('bad');
            }
        }

        return maybeDeck.get('id');
    }());

    yield loadCardsList(rootCursor, deckID, pageNum);

    next();
    return;
});

// review on a deck and its children
const ensureDeckReviewRoute = co.wrap(function*(store, ctx, next) {

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

    // fetch deck
    const deck = yield loadDeck(maybeID, NOT_SET);

    if(deck === NOT_SET) {
        // 404
        defaultRoute(rootCursor);
        return;
    }

    // load deck onto app state
    rootCursor.cursor(paths.transaction).update(function(map) {
        return map.withMutations(function(__map) {
            __map.set(paths.deck.self, deck);
        });
    });


    // fetch next card to review
    const {response} = yield new Promise(function(resolve) {
        superhot
            .get(`/decks/${maybeID}/review`)
            .end(function(err, res){
                // TODO: error handling
                resolve({err: err, response: res});
            });
    });

    // TODO: error handling

    const reviewCard = response.status == 404 ? NOT_SET : Immutable.fromJS(response.body);

    rootCursor.cursor(paths.transaction).update(function(map) {
        return map.withMutations(function(__map) {
            __map
                .set(paths.review.self, reviewCard)
                .set(paths.route.handler, Dashboard);
        });
    });

    next();
    return;
});


// returns deck (Immutable.Map) of given deckID; defaultValue otherwise
const loadDeck = co.wrap(function*(deckID, defaultValue) {
    // fetch deck
    const {decksResponse} = yield new Promise(function(resolve) {
        superhot
            .get(`/decks/${deckID}`)
            .end(function(err, res){
                resolve({decksErr: err, decksResponse: res});
            });
    });

    switch(decksResponse.status) {
    case 404:
        return defaultValue;
        break;
    case 200:
        // good
        return Immutable.fromJS(decksResponse.body);
        break;
    default:
        throw Error('http code not found');
        // TODO: error handling
    }
});

// note: not transaction safe
const loadCardsList = co.wrap(function*(rootCursor, deckID, pageNum = 1) {

    // get page count
    const {cardsCount} = yield new Promise(function(resolve) {
        superhot
            .get(`/decks/${deckID}/cards/count`)
            .query({ 'page': pageNum })
            .end(function(err, res){
                resolve({err: err, cardsCount: res.body && res.body.total || 0});
            });
    });

    rootCursor.cursor(paths.dashboard.cards.total).update(function() {
        return cardsCount;
    });

    if(cardsCount <= 0) {
        rootCursor.cursor(paths.dashboard.cards.list).update(function() {
            return Immutable.List();
        });
        rootCursor.cursor(paths.dashboard.cards.numOfPages).update(function() {
            return 0;
        });
        rootCursor.cursor(paths.dashboard.cards.page).update(function() {
            return 1;
        });

        return;
    }

    // TODO: move this constant
    const perPage = 25;

    rootCursor.cursor(paths.dashboard.cards.page).update(function() {
        return (pageNum-1)*perPage >= cardsCount ? 1 : pageNum;
    });

    rootCursor.cursor(paths.dashboard.cards.numOfPages).update(function() {
        return Math.ceil(cardsCount / perPage);
    });

    // load cards
    const fetchCards = co.wrap(function* (_pageNum) {
        const {cardsResponse} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${deckID}/cards`)
                .query({ 'page': _pageNum })
                .query({ 'per_page': perPage })
                .end(function(err, res){
                    resolve({cardsErr: err, cardsResponse: res});
                });
        });
        // TODO: error handling

        switch(cardsResponse.status) {
        case 400:
            // page of out of bounds;
            // load the first page
            yield fetchCards(1);
            return;
            break;
        case 404:
            rootCursor.cursor(paths.dashboard.cards.list).update(function() {
                return Immutable.List();
            });
            return;
            break;
        case 200:
            // good
            rootCursor.cursor(paths.dashboard.cards.list).update(function() {
                return Immutable.fromJS(cardsResponse.body);
            });
            break;
        default:
            throw Error('http code not found');
            // TODO: error handling
        }
    });
    yield fetchCards(pageNum);

});
