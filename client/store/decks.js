const Immutable = require('immutable');

const {paths} = require('store/constants');
const superhot = require('store/superhot');

const {setNewDeck} = require('./dashboard');

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
    },

    createNewDeck(state, name) {

        // fetch parent
        const parentID = state.cursor(paths.currentDeck).deref().get('id');

        // optimistic update
        let oldChildren;
        state.cursor(paths.currentChildren).update(function(lst) {
            oldChildren = lst;
            return lst.push(Immutable.fromJS({
                name: name,
                description: ''
            }));
        });

        superhot
            .post(`/decks`)
            .type('json')
            .send({
                name: name,
                parent: parentID
            })
            .end(function(err, res) {

                // TODO: error handling
                if(res.status !== 201) {

                    // revert optimistic update
                    state.cursor(paths.currentChildren).update(function() {
                        return oldChildren;
                    });
                    return;
                }

                state.cursor(paths.currentDeck).cursor('children').update(function(lst) {
                    return lst.push(res.body.id);
                });
            });

        setNewDeck(state, false);
    }
};

module.exports = transforms;
