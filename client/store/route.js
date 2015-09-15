const page = require('page');

const {paths} = require('store/constants');
const {generateSlug} = require('store/utils');

const transforms = {
    toDeck(state, deck = void 0, deckID = void 0) {

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}`);
    },

    toDeckSettings(state, deck = void 0, deckID = void 0) {

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}/settings`);
    },

    toDeckCards(state, deck = void 0, deckID = void 0) {

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}/cards`);
    },

    toDeckCardsNew(state, deck = void 0, deckID = void 0) {

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}/cards/new`);
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

/* helpers */

const resolveDeck = function(state, deck = void 0, deckID = void 0) {
    state.cursor(paths.deck.self).update(function(_deck) {
        deck = deck || _deck;
        return deck;
    });

    if(!deckID) {
        deckID = deck.get('id');
    }

    return {deck, deckID};
};
