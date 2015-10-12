const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const {paths, NOT_SET} = require('store/constants');
const superhot = require('store/superhot');

const transforms = {

    applyDeckArgs(state, options = {}) {

        const deck = state.cursor(paths.deck.self).deref();
        const deckID = deck.get('id');

        options.deck = deck;
        options.deckID = deckID;

        return options;
    },

    // passthroughs

    setDeck: function(state, options) {

        const {deck} = options;

        state.cursor(paths.deck.self).update(function() {
            return deck;
        });

        return options;
    },

    setRootDeck: function(state, options) {

        const {deckID} = options;

        state.cursor(paths.root).update(function() {
            return deckID;
        });

        return options;
    },

    setChildren(state, options) {

        const {children} = options;

        state.cursor(paths.deck.children).update(function() {
            return children;
        });

        return options;
    },

    setNewBreadcrumb(state, options) {

        const {decks} = options;

        state.cursor(paths.deck.breadcrumb).update(function() {
            return Immutable.List().concat(decks);
        });

        return options;
    },

    pushOntoBreadcrumb(state, options) {

        const {deck} = options;

        state.cursor(paths.deck.breadcrumb).update(function(lst) {
            return lst.push(deck);
        });

        return options;
    },

    pushManyOntoBreadcrumb(state, options) {

        const {decks} = options;

        state.cursor(paths.deck.breadcrumb).update(function(lst) {
            return lst.concat(decks);
        });

        return options;
    },

    popFromBreadcrumb(state, options) {

        const {deckID} = options;

        state.cursor(paths.deck.breadcrumb).update(function(lst) {

            if(lst.size <= 0) {
                return lst;
            }

            const id = deckID;

            let current = lst.last().get('id');
            while(lst.size > 0 && current != id) {
                lst = lst.pop();
                current = lst.last().get('id');
            }

            return lst;
        });

        return options;
    },

    saveDeck: co.wrap(function*(state, options) {

        const {patchDeck} = options;

        if(!_.isPlainObject(patchDeck)) {
            // TODO: error here
            throw Error('bad patch');
            return void 0;
        }

        let willChange = true;

        // optimistic update
        state.cursor(paths.deck.self).update(function(deck) {

            const oldDeck = deck;

            if(_.has(patchDeck, 'name')) {
                deck = deck.update('name', function() {
                    return patchDeck.name;
                });
            }

            if(_.has(patchDeck, 'description')) {
                deck = deck.update('description', function() {
                    return patchDeck.description;
                });
            }

            willChange = oldDeck != deck;

            return deck;
        });

        if(!willChange) {
            return options;
        }

        const {deckID} = options;

        // save deck
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/decks/${deckID}`)
                .send(patchDeck)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');

            // TODO: revert optimistic update
        }

        options.deck = state.cursor(paths.deck.self).deref();

        return options;
    }),

    createNewDeck(state, options) {

        // fetch parent
        const {deckID: parentID, newDeck} = options;

        let request = _.assign({}, newDeck, {parent:parentID});

        return new Promise(function(resolve) {
            superhot
                .post(`/decks`)
                .type('json')
                .send(request)
                .end(function(err, res) {

                    options.deck = void 0;
                    options.deckID = res.body.id;

                    return resolve(options);
                });
        });
    },

    deleteDeck: co.wrap(function*(state, options) {

        const {deck} = options;

        // fetch parent
        if(!deck.get('hasParent', false)) {
            throw Error('bad delete');
            return void 0;
        }

        const {deckID} = options;
        const parentID = deck.get('parent');


        yield new Promise(function(resolve) {
            superhot
                .del(`/decks/${deckID}`)
                .end(function() {
                    resolve();
                });
        });

        // go to parent
        const breadcrumb = state.cursor(paths.deck.breadcrumb).deref();
        const parentDeck = breadcrumb.get(-2);

        options.deckID = parentID;
        options.deck = parentDeck;

        return options;
    }),

    isCurrentDeck(state, options) {

        const {deckID} = options;

        const deckCursor = state.cursor(paths.deck.self);
        const deck = deckCursor.deref(NOT_SET);
        const maybedeckID = deck === NOT_SET ? NOT_SET : deck.get('id', NOT_SET);

        options.isCurrentDeck = (deckID == maybedeckID);

        return options;
    }
};

module.exports = transforms;
