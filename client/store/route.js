const page = require('page');

const {paths} = require('store/constants');
const {generateSlug} = require('store/utils');

const transforms = {
    toDeck(state, deck, deckID) {

        if(!deckID) {
            deckID = deck.get('id');
        }

        state.cursor(paths.deck.self).update(function() {
            return deck;
        });

        const slugged = generateSlug(deck.get('name'), deckID);

        page(`/deck/${deckID}/${slugged}`);
    },

    redirectToDeck(state, deck, deckID) {

        if(!deckID) {
            deckID = deck.get('id');
        }

        state.cursor(paths.deck.self).update(function() {
            return deck;
        });

        const slugged = generateSlug(deck.get('name'), deckID);

        page.redirect(`/deck/${deckID}/${slugged}`);
    },
};

module.exports = transforms;
