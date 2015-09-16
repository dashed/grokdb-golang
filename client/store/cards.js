const co = require('co');
const _ = require('lodash');

const superhot = require('store/superhot');
const {paths} = require('store/constants');

const {toDeckCards, toCardProfile} = require('store/route');

const transforms = {
    createNewCard(state, cardProps) {

        // get deck id
        const deck = state.cursor(paths.deck.self).deref();
        const deckID = deck.get('id');

        const marshalledSides = JSON.stringify(cardProps.sides);

        // TODO: optimistic update

        superhot
            .post(`/cards`)
            .type('json')
            .send({
                title: cardProps.title,
                description: cardProps.description,
                sides: marshalledSides,
                deck: deckID
            })
            .end(function() {
                // go to card list
                toDeckCards(state, {deck, deckID});
            });
    },

    navigatetoCard(state, card) {

        state.cursor(paths.card.self).update(function() {
            return card;
        });

        toCardProfile(state, card);
    },

    saveCard: co.wrap(function*(state, patchCard) {

        if(!_.isPlainObject(patchCard)) {
            // TODO: error here
            return;
        }

        const cardID = state.cursor(paths.card.self).deref().get('id');

        let willChange = true;

        // optimistic update
        state.cursor(paths.card.self).update(function(card) {

            const oldCard = card;

            if(_.has(patchCard, 'title')) {
                card = card.update('title', function() {
                    return patchCard.title;
                });
            }

            if(_.has(patchCard, 'description')) {
                card = card.update('description', function() {
                    return patchCard.description;
                });
            }

            if(_.has(patchCard, 'sides')) {
                card = card.update('sides', function() {
                    return patchCard.sides;
                });
            }

            if(_.has(patchCard, 'deck')) {
                card = card.update('deck', function() {
                    return patchCard.deck;
                });
            }

            willChange = oldCard != card;

            return card;
        });

        if(!willChange) {

            // get out of editing mode
            toCardProfile(state, {
                card: state.cursor(paths.card.self).deref(),
                cardID
            });
            return;
        }

        // save deck
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

        // get out of editing mode
        toCardProfile(state, {
            card: state.cursor(paths.card.self).deref(),
            cardID
        });
    })
};

module.exports = transforms;
