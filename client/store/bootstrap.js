const page = require('page');
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const {NOT_SET, paths} = require('store/constants');
const {changeCurrentDeckByID} = require('store/decks');
const superhot = require('store/superhot');

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

        // reset state
        rootCursor.cursor(paths.editingDeck).update(function() {
            return false;
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
        if(_.isNaN(maybeID) || !Number.isInteger(maybeID) || maybeID <= 0) {
            page.redirect('/');
            return;
        }

        store.dispatch(changeCurrentDeckByID, maybeID);
    });

    page('/deck/:id/:slug', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(_.isNaN(maybeID) || !Number.isInteger(maybeID) || maybeID <= 0) {
            page.redirect('/');
            return;
        }

        const deckID = rootCursor.cursor(paths.currentDeck).cursor('id').deref();

        if(deckID != maybeID) {
            console.log('moo');
            store.dispatch(changeCurrentDeckByID, maybeID);
            return;
        }

        rootCursor.cursor(paths.routeHandler).update(function() {
            return Dashboard;
        });
    });

    page('/decksetting/:id', function(ctx) {

        const maybeID = filterInt(ctx.params.id);

        // ensure :id is valid
        if(_.isNaN(maybeID) || !Number.isInteger(maybeID) || maybeID <= 0) {
            page.redirect('/');
            return;
        }

        const cursor = rootCursor.cursor(paths.currentDeck).cursor('id');

        const deckID = cursor.deref();

        const handler = function() {
            rootCursor.cursor(paths.editingDeck).update(function() {
                return true;
            });
            rootCursor.cursor(paths.routeHandler).update(function() {
                return Dashboard;
            });
        };

        if(deckID != maybeID) {

            store.dispatch(changeCurrentDeckByID, maybeID, function(currentDeck) {

                const _deckID = currentDeck.get('id');

                if(_deckID == maybeID) {
                    handler.call(void 0);
                }
            });

            return;
        }

        handler.call(void 0);

    });

    page.start({
        hashbang: true,
        click: false,
        // dispatch: false
    });



});

const bootDecks = co.wrap(function* (store) {
    const rootCursor = store.state();

    /* currently viewed deck's children */

    // implicitly observe and load current deck's children
    rootCursor.cursor(paths.currentDeck).cursor('children').observe(co.wrap(function*() {

        const deckID = rootCursor.cursor(paths.currentDeck).cursor('id').deref();

        // reset
        rootCursor.cursor(paths.currentChildren).update(function() {
            return NOT_SET;
        });

        const children = yield new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/children`)
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

        rootCursor.cursor(paths.currentChildren).update(function() {
            return children;
        });

    }));

    /* breadcrumb setup */

    rootCursor.cursor(paths.currentDeck).on('any', co.wrap(function*(currentDeck) {

        const currentDeckID = currentDeck.get('id');
        let breadcrumb;

        // TODO: error handling
        ({ancestors: breadcrumb} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${currentDeckID}/ancestors`)
                .end(function(err, res){

                    if (res.status === 404) {
                        return resolve({err: null, ancestors: []});
                    } else if(res.status === 200) {
                        return resolve({err: null, ancestors: res.body.ancestors});
                    }

                    resolve({err: err, ancestors: []});
                });
        }));

        breadcrumb.push(currentDeckID);

        // resolve ancestors into decks
        const ancestorsPromise = _.map(breadcrumb, function(deckID) {
            return new Promise(function(resolve) {
                superhot
                    .get(`/decks/${deckID}`)
                    .end(function(err2, res2){
                        // TODO: error handling
                        resolve(Immutable.fromJS(res2.body));
                    });
            });
        });

        breadcrumb = Immutable.List(yield ancestorsPromise);

        rootCursor.cursor(paths.breadcrumb).update(function() {
            return breadcrumb;
        });
    }));

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
