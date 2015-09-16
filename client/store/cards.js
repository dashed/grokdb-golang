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
};

module.exports = transforms;
