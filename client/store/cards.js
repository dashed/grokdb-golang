const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const superhot = require('store/superhot');
const {paths, NOT_SET} = require('store/constants');
const {parseDeckCardsPageNum, parseStashCardsPageNum, parseOrder, parseSort, parseNumOfPages} = require('store/stateless/cards');

const transforms = {

    applyCardArgs(state, options = {}) {

        const card = state.cursor(paths.card.self).deref();
        const cardID = card.get('id');

        options.card = card;
        options.cardID = cardID;

        return options;
    },

    // this is for cards page for decks
    applyDeckCardsPageArgs: co.wrap(function*(state, options = {}) {

        const deckID = (function() {
            const deck = state.cursor(paths.deck.self).deref();
            if(!Immutable.Map.isMap(deck)) {
                return 0;
            }
            return deck.get('id', 0);
        }());

        options.pageNum = yield parseDeckCardsPageNum(deckID, state.cursor(paths.dashboard.cards.page).deref());
        options.sort = yield parseSort(state.cursor(paths.dashboard.cards.sort).deref());
        options.order = yield parseOrder(state.cursor(paths.dashboard.cards.order).deref());
        options.numOfPages = yield parseNumOfPages(state.cursor(paths.dashboard.cards.numOfPages).deref());

        return options;
    }),

    applyStashCardsPageArgs: co.wrap(function*(state, options = {}) {

        const deckID = (function() {
            const deck = state.cursor(paths.deck.self).deref();
            if(!Immutable.Map.isMap(deck)) {
                return 0;
            }
            return deck.get('id', 0);
        }());

        options.pageNum = yield parseStashCardsPageNum(deckID, state.cursor(paths.dashboard.cards.page).deref());
        options.sort = yield parseSort(state.cursor(paths.dashboard.cards.sort).deref());
        options.order = yield parseOrder(state.cursor(paths.dashboard.cards.order).deref());
        options.numOfPages = yield parseNumOfPages(state.cursor(paths.dashboard.cards.numOfPages).deref());

        return options;
    }),

    // applySortArgs(state, options = {}) {

    // },

    // applySearchArgs(state, options = {}) {

    // },

    // passthroughs

    setCard: function(state, options) {

        const {card} = options;

        state.cursor(paths.card.self).update(function() {
            return card;
        });
        return options;
    },

    createNewCard: co.wrap(function*(state, options) {

        const {deckID, newCard} = options;

        return new Promise(function(resolve) {
            superhot
                .post(`/cards`)
                .type('json')
                .send({
                    title: newCard.title,
                    description: newCard.description,
                    front: newCard.front,
                    back: newCard.back,
                    deck: deckID
                })
                .end(function(err, res) {

                    // TODO: error handling
                    if(res.status != 201) {
                        throw Error('bad');
                    }

                    options.card = Immutable.fromJS(res.body);
                    options.cardID = res.body.id;

                    return resolve(options);
                });
        });
    }),

    deleteCard: co.wrap(function*(state, options) {

        const {cardID} = options;

        return new Promise(function(resolve) {
            superhot
                .del(`/cards/${cardID}`)
                .end(function() {
                    resolve(options);
                });
        });
    }),

    saveCard: co.wrap(function*(state, options) {

        const {patchCard} = options;

        if(!_.isPlainObject(patchCard)) {
            // TODO: error here
            throw Error('bad patch');
            return void 0;
        }

        let willChange = true;

        // optimistic update
        state.cursor(paths.card.self).update(function(card) {

            const oldCard = card;

            const overrides = Immutable.fromJS(patchCard);

            card = card.mergeDeep(overrides);

            willChange = oldCard !== card;

            return card;
        });

        if(!willChange) {
            return options;
        }

        const {cardID} = options;

        // TODO: refactor to use stateless
        // save card
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/cards/${cardID}`)
                .send(patchCard)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');

            // TODO: revert optimistic update
        }

        options.card = Immutable.fromJS(response.body);

        state.cursor(paths.card.self).update(function() {
            return options.card;
        });

        return options;
    }),

    setCardsList(state, options) {
        const {cardsList} = options;

        state.cursor(paths.dashboard.cards.list).update(function() {
            return cardsList;
        });

        return options;
    },

    isCurrentCard(state, options) {
        const {cardID} = options;

        const cardCursor = state.cursor(paths.card.self);
        const card = cardCursor.deref(NOT_SET);
        const maybecardID = card === NOT_SET ? NOT_SET : card.get('id', NOT_SET);

        options.isCurrentCard = (cardID == maybecardID);

        return options;
    }
};

module.exports = transforms;
