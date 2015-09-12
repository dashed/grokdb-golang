const co = require('co');
const slugify = require('slug');
const page = require('page');
const Immutable = require('immutable');
const _ = require('lodash');

const constants = require('store/constants');
const {NOT_LOADED} = constants;
const superhot = require('./superhot');

const bootRouter = co.wrap(function* (rootCursor) {
    /* router setup */
    page('/', function(/*ctx*/) {

        const cursor = rootCursor.cursor(constants.paths.currentDeck);

        if(cursor.deref(NOT_LOADED) === NOT_LOADED) {

            cursor.once('any', function() {
                const deck = cursor.deref();
                page(`/deck/${deck.get('id')}/${deck.get('name')}`);
            });

            return;
        }

        const deck = cursor.deref();
        const slugged = slugify(deck.get('name')).trim();
        page(`/deck/${deck.get('id')}/${slugged}`);
    });

    page('/deck/:id/:slug', function(ctx) {

        const cursor = rootCursor.cursor(constants.paths.currentDeck);

        const handler = function() {
            const deck = cursor.deref();
            const id = ctx.params.id;

            // correct id as necessary
            if(id != deck.get('id')) {
                const slugged = slugify(deck.get('name')).trim();
                page(`/deck/${deck.get('id')}/${slugged}`);
                return;
            }

            rootCursor.cursor(constants.paths.route).update(function() {
                return ctx.pathname;
            });
        }

        if(cursor.deref(NOT_LOADED) === NOT_LOADED) {
            cursor.once('any', function() {
                handler();
            });
            return;
        }

        handler();
    });

    page('/archive', function(ctx) {
        rootCursor.cursor(constants.paths.route).update(function() {
            return ctx.pathname;
        });
    });

    page('*', function() {
        rootCursor.cursor(constants.paths.route).update(function() {
            return '/';
        });
    });

    page.start({
        hashbang: true,
        click: false,
        dispatch: false
    });

    // fetch route config value
    const {response} = yield new Promise(function(resolve, reject) {
        superhot
            .get(`/configs/${constants.configs.route}`)
            .end(function(err2, res2){
                switch (res2.status) {
                case 404:
                    superhot
                        .post(`/configs/${constants.configs.route}`)
                        .type('json')
                        .send({ value: '/' })
                        .end(function(err3, res3) {
                            resolve({err: err3, response: res3});
                        });
                    break;
                case 200:
                    resolve({err: err2, response: res2});
                    break;
                default:
                    return reject(`couldn't catch the HTTP status codes we were looking for.`);
                }
            });
    });

    // TODO: error handling. note: 4xx are errors

    // inject route value from REST API into app state and begin router execution
    page(response.body.value);

    // submit route value from app state to REST API
    rootCursor.cursor(constants.paths.route).observe(function(newPath) {
        superhot
            .post(`/configs/${constants.paths.route}`)
            .type('json')
            .send({ value: newPath })
            // noop
            .end(() => void 0);
    });
});

const bootDecks = co.wrap(function* (rootCursor) {

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
    rootCursor.cursor(constants.paths.root).update(function() {
        return response.body.id;
    });

    /* currently viewed deck's children */

    // implicitly observe and load current deck's children
    rootCursor.cursor(constants.paths.currentDeck).cursor('children').observe(co.wrap(function*() {

        // invariant: updated is Immutable.List
        // TODO: verify above invariant

        // cannot yield an iterable in co
        // const promises = updated.map(function(deckID) {
        //     return new Promise(function(resolve) {
        //         superhot
        //             .get(`/decks/${deckID}`)
        //             .end(function(err2, res2){
        //                 // TODO: error handling
        //                 resolve(res2.body);
        //             });
        //     });
        // });

        const deckID = rootCursor.cursor(constants.paths.currentDeck).cursor('id').deref();

        // reset
        rootCursor.cursor(constants.paths.currentChildren).update(function() {
            return NOT_LOADED;
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

        rootCursor.cursor(constants.paths.currentChildren).update(function() {
            return children;
        });

    }));

    /* currently viewed deck */

    const currentDeck = yield co(function*() {

        // fetch config
        const {configResponse} = yield new Promise(function(resolve) {
            superhot
                .get(`/configs/${constants.configs.currentDeck}`)
                .end(function(err2, res2){
                    resolve({configErr: err2, configResponse: res2});
                });
        });

        let deckID;
        if(configResponse.status === 404) {

            // let root deck be the default
            deckID = rootCursor.cursor(constants.paths.root).deref();

            // set current deck config
            superhot
                .post(`/configs/${constants.configs.currentDeck}`)
                .type('json')
                // set root deck to be the currently viewed deck
                .send({ value: `${deckID}` })
                .end();

        } else if(configResponse.status === 200) {

            deckID = configResponse.body.value;

        } else {
            throw Error(`couldn't catch the HTTP status codes we were looking for.`);
        }

        // fetch deck
        const {decksResponse} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${deckID}`)
                .end(function(err2, res2){
                    resolve({decksErr: err2, decksResponse: res2});
                });
        });

        // TODO: error handling here

        return decksResponse.body;
    });

    // inject currently viewed deck from app state into REST API
    rootCursor.cursor(constants.paths.currentDeck).observe(function(deck, oldDeck) {
        // set current deck config

        const deckID = deck.get('id');

        // set route
        if(Immutable.Map.isMap(deck) && Immutable.Map.isMap(oldDeck)) {
            const slugged = slugify(deck.get('name')).trim();
            page(`/deck/${deck.get('id')}/${slugged}`);
        }

        superhot
            .post(`/configs/${constants.configs.currentDeck}`)
            .type('json')
            // set root deck to be the currently viewed deck
            .send({ value: `${deckID}` })
            .end();
    });

    // inject currently viewed deck from REST API into app state
    rootCursor.cursor(constants.paths.currentDeck).update(function() {

        // invariant: currentDeck is a plain object
        return Immutable.fromJS(currentDeck);
    });

    /* breadcrumb setup */

    const breadcrumb = yield co(function*() {

        // fetch config
        const {configResponse} = yield new Promise(function(resolve) {
            superhot
                .get(`/configs/${constants.configs.breadcrumb}`)
                .end(function(err2, res2){
                    resolve({configErr: err2, configResponse: res2});
                });
        });


        let _breadcrumb;
        if(configResponse.status === 404) {

            // TODO: error handling
            ({ancestors: _breadcrumb} = yield new Promise(function(resolve) {
                superhot
                    .get(`/decks/${currentDeck.id}/ancestors`)
                    .end(function(err2, res2){

                        if (res2.status === 404) {
                            return resolve({err: null, ancestors: []});
                        } else if(res2.status === 200) {
                            return resolve({err: null, ancestors: res2.ancestors});
                        }

                        resolve({err: err2, ancestors: []});
                    });
            }));

            _breadcrumb.push(currentDeck.id);

            // set current breadcrumb config
            superhot
                .post(`/configs/${constants.configs.breadcrumb}`)
                .type('json')
                .send({ value: `${JSON.stringify(_breadcrumb)}` })
                .end();

        } else if(configResponse.status === 200) {

            _breadcrumb = JSON.parse(configResponse.body.value);

        } else {
            throw Error(`couldn't catch the HTTP status codes we were looking for.`);
        }

        // resolve ancestors into decks
        const ancestorsPromise = _.map(_breadcrumb, function(deckID) {
            return new Promise(function(resolve) {
                superhot
                    .get(`/decks/${deckID}`)
                    .end(function(err2, res2){
                        // TODO: error handling
                        resolve(Immutable.fromJS(res2.body));
                    });
            });
        });

        return Immutable.List(yield ancestorsPromise);
    });

    rootCursor.cursor(constants.paths.breadcrumb).update(function() {
        return breadcrumb;
    });

    // breadcrumb to REST API
    rootCursor.cursor(constants.paths.breadcrumb).observe(function(lst) {

        lst = lst.reduce(function(reduction, deck) {
            reduction.push(deck.get('id'));
            return reduction;
        }, []);

        // set current breadcrumb config
        superhot
            .post(`/configs/${constants.configs.breadcrumb}`)
            .type('json')
            .send({ value: `${JSON.stringify(lst)}` })
            // TODO: error handling
            .end();
    });

    // watch self (i.e. currentDeck) and update tail of breadcrumb
    rootCursor.cursor(constants.paths.currentDeck).observe(function(updatedCurrentDeck) {
        rootCursor.cursor(constants.paths.breadcrumb).update(function(lst) {

            if(lst.size <= 0) {
                return lst;
            }

            if(lst.last().get('id') == updatedCurrentDeck.get('id')) {
                return lst.set(-1, updatedCurrentDeck);
            }

            return lst;
        });
    });
});


module.exports = function(store) {

    co(function* () {
        const rootCursor = store.state();

        // connect to REST API

        yield [
            bootRouter(rootCursor),
            bootDecks(rootCursor)
        ];
    }).catch(function(err) {
        // TODO: proper error logging
        console.error(err);
        console.error(err.stack);
    });


    return store;
};
