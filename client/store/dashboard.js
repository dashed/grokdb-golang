const {paths} = require('store/constants');

const transforms = {
    setEditingDeck(state, bool) {
        state.cursor(paths.editingDeck).update(function() {
            return bool;
        });
    },

    setNewDeck(state, bool) {
        state.cursor(paths.creatingNewDeck).update(function() {
            return bool;
        });
    }
};

module.exports = transforms;
