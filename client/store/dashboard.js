const {paths} = require('store/constants');

const transforms = {
    setNewDeck(state, options) {

        const {value} = options;

        state.cursor(paths.dashboard.decks.creatingNew).update(function() {
            return value;
        });

        return options;
    }
};

module.exports = transforms;
