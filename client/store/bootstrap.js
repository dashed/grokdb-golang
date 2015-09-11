const co = require('co');
const page = require('page');
const Immutable = require('immutable');

const constants = require('store/constants');
const superhot = require('./superhot');

const bootRouter = co.wrap(function* (rootCursor) {
    /* router setup */
    page('/', function(ctx) {
        rootCursor.cursor(constants.paths.route).update(function() {
            return ctx.pathname;
        });
    });

    page('/decks/:id/:slug', function(ctx) {
        rootCursor.cursor(constants.paths.route).update(function() {
            return ctx.pathname;
        });
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

    // inject route value from REST API into app state
    rootCursor.cursor(constants.paths.route).update(function() {
        return response.body.value;
    });

    // begin router execution
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

    // TODO: implement
    // observe currently viewed deck and load children

    /* currently viewed deck */

    // implicitly observe and load current deck's children
    rootCursor.cursor(constants.paths.currentDeck).cursor('children').observe(co.wrap(function*(updated) {

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

        const promises = updated.reduce(function(promiseList, deckID) {
            const waiting = new Promise(function(resolve) {
                superhot
                    .get(`/decks/${deckID}`)
                    .end(function(err2, res2){
                        // TODO: error handling
                        resolve(Immutable.fromJS(res2.body));
                    });
            });

            promiseList.push(waiting);

            return promiseList;
        }, []);

        const result = yield promises;

        rootCursor.cursor(constants.paths.currentChildren).update(function() {
            return Immutable.List(result);
        });

    }));

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

    // inject currently viewed deck from REST API into app state
    rootCursor.cursor(constants.paths.currentDeck).update(function() {

        // invariant: currentDeck is a plain object
        return Immutable.fromJS(currentDeck);
    });
});


module.exports = co.wrap(function* (store) {
    const rootCursor = store.state();

    // connect to REST API

    yield [
        bootRouter(rootCursor),
        bootDecks(rootCursor)
    ];

    return store;
});
