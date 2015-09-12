const {paths} = require('store/constants');

const transforms = {
    navigateChildDeck(state, childDeck) {
        state.cursor(paths.currentDeck).update(function() {
            return childDeck;
        });

        transforms.pushOntoBreadcrumb(state, childDeck);
    },

    navigateParentDeck(state, parentDeck) {
        state.cursor(paths.currentDeck).update(function() {
            return parentDeck;
        });

        transforms.popFromBreadcrumb(state, parentDeck);
    },

    pushOntoBreadcrumb(state, deck) {
        state.cursor(paths.breadcrumb).update(function(lst) {
            return lst.push(deck);
        });
    },

    popFromBreadcrumb(state, deck) {
        state.cursor(paths.breadcrumb).update(function(lst) {

            if(lst.size <= 0) {
                return lst;
            }

            const id = deck.get('id');

            let current = lst.last().get('id');
            while(lst.size > 0 && current != id) {
                lst = lst.pop();
                current = lst.last().get('id');
            }

            return lst;
        });
    }
};

module.exports = transforms;
