const qs = require('qs');
const page = require('page');

const {paths} = require('store/constants');
const {generateSlug} = require('store/utils');

const transforms = {

    validDeckSlug(state, options) {

        let {slug, deck, deckID} = options;
        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);

        options.validDeckSlug = slugged == slug;

        return options;
    },

    toDeck(state, options = {}) {

        let {deck, deckID} = options;
        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}`);
    },

    redirectToDeck(state, options = {}) {

        let {deck, deckID} = options;
        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page.redirect(`/deck/${deckID}/${slugged}`);
    },

    toDeckSettings(state, options = {}) {

        let {deck, deckID} = options;

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}/settings`);
    },

    toDeckCards(state, options = {}) {

        let {deck, deckID} = options;
        const {page: _pageNum = 1, order: _order = 'DESC', sort: _sort = 'reviewed_at'} = options;

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);

        const params = qs.stringify({page: _pageNum, order: _order, sort: _sort});

        page(`/deck/${deckID}/${slugged}/cards?${params}`);
    },

    toDeckCardsNew(state, options = {}) {

        let {deck, deckID} = options;

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        const slugged = generateSlug(deck.get('name'), deckID);
        page(`/deck/${deckID}/${slugged}/cards/new`);
    },

    toCardProfile(state, options = {}) {

        let {card, cardID} = options;

        ({card, cardID} = resolveCard(state, card, cardID));

        page(`/card/${cardID}`);
    },

    toCardProfileEdit(state, options = {}) {

        let {card, cardID} = options;

        ({card, cardID} = resolveCard(state, card, cardID));

        page(`/card/${cardID}/edit`);
    },

    toReview(state, options = {}) {

        let {deck, deckID} = options;

        ({deck, deckID} = resolveDeck(state, deck, deckID));

        page(`/review/deck/${deckID}`);
    }
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

const resolveCard = function(state, card = void 0, cardID = void 0) {
    state.cursor(paths.card.self).update(function(_card) {
        card = card || _card;
        return card;
    });

    if(!cardID) {
        cardID = card.get('id');
    }

    return {card, cardID};
};
