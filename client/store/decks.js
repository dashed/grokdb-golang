const {paths} = require('store/constants');

module.exports = {
    setCurrentDeck(state, newCurrentDeck) {
        state.cursor(paths.currentDeck).update(function() {
            return newCurrentDeck;
        });
    },

    pushOntoBreadcrumb(state, deck) {

    }
};
