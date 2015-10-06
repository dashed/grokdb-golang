const {paths} = require('store/constants');

const transforms = {
    setStashList(state, options = {}) {
        const {stashList} = options;

        state.cursor(paths.dashboard.stashes.list).update(function() {
            return stashList;
        });

        return options;
    },

    setStash(state, options = {}) {
        const {stash} = options;

        state.cursor(paths.stash.self).update(function() {
            return stash;
        });

        return options;
    },

    setStashCards(state, options = {}) {
        const {stashCards} = options;

        state.cursor(paths.stash.cards).update(function() {
            return stashCards;
        });

        return options;
    }
};

module.exports = transforms;
