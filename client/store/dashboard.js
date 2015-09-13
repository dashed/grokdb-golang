const page = require('page');

const {paths} = require('store/constants');

const transforms = {
    setEditingDeck(state, bool) {

        const deckID = state.cursor(paths.currentDeck).cursor('id').deref();

        if(bool) {
            page(`/decksetting/${deckID}`);
            return;
        }

        state.cursor(paths.editingDeck).update(function() {
            return false;
        });

        page(`/deck/${deckID}`);
    },

    setNewDeck(state, bool) {
        state.cursor(paths.creatingNewDeck).update(function() {
            return bool;
        });
    }
};

module.exports = transforms;
