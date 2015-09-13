const page = require('page');
const slugify = require('slug');

const {paths} = require('store/constants');

const transforms = {
    setEditingDeck(state, bool) {

        const currentDeck = state.cursor(paths.currentDeck).deref();

        const deckID = currentDeck.get('id');
        const name = currentDeck.get('name');

        if(bool) {
            page(`/decksetting/${deckID}`);
            return;
        }

        state.cursor(paths.editingDeck).update(function() {
            return false;
        });

        let slugged = slugify(name.trim());
        slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

        page(`/deck/${deckID}/${slugged}`);
    },

    setNewDeck(state, bool) {
        state.cursor(paths.creatingNewDeck).update(function() {
            return bool;
        });
    }
};

module.exports = transforms;
