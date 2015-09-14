const page = require('page');
const slugify = require('slug');

const {paths, dashboard} = require('store/constants');

const transforms = {
    setEditingDeck(state, bool) {

        const currentDeck = state.cursor(paths.deck.self).deref();

        const deckID = currentDeck.get('id');
        const name = currentDeck.get('name');

        if(bool) {
            page(`/decksetting/${deckID}`);
            return;
        }

        state.cursor(paths.dashboard.decks.editing).update(function() {
            return false;
        });

        let slugged = slugify(name.trim());
        slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

        page(`/deck/${deckID}/${slugged}`);
    },

    setNewDeck(state, bool) {
        state.cursor(paths.dashboard.decks.creatingNew).update(function() {
            return bool;
        });
    },

    switchView(state, view) {

        const currentDeck = state.cursor(paths.deck.self).deref();

        const deckID = currentDeck.get('id');

        switch(view) {
        case dashboard.view.cards:

            page(`/cards/${deckID}`);
            return;

            break;
        case dashboard.view.decks:

            const name = currentDeck.get('name');
            let slugged = slugify(name.trim());
            slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

            page(`/deck/${deckID}/${slugged}`);
            return;

            break;
        }
    }
};

module.exports = transforms;
