const {paths} = require('store/constants');

const transforms = {
    setNewDeck(state, bool) {
        state.cursor(paths.dashboard.decks.creatingNew).update(function() {
            return bool;
        });
    }
};

module.exports = transforms;
