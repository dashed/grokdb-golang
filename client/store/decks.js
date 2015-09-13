const page = require('page');
const Immutable = require('immutable');
const co = require('co');
const slugify = require('slug');

const {NOT_SET, paths} = require('store/constants');
const superhot = require('store/superhot');

const {setNewDeck} = require('./dashboard');

const transforms = {
    navigateChildDeck(state, childDeck) {
        state.cursor(paths.currentDeck).update(function() {
            return childDeck;
        });

        transforms.pushOntoBreadcrumb(state, childDeck);

        const deckID = childDeck.get('id');

        let slugged = slugify(childDeck.get('name').trim());
        slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

        page(`/deck/${deckID}/${slugged}`);
    },

    navigateParentDeck(state, parentDeck) {
        state.cursor(paths.currentDeck).update(function() {
            return parentDeck;
        });

        transforms.popFromBreadcrumb(state, parentDeck);

        const deckID = parentDeck.get('id');

        let slugged = slugify(parentDeck.get('name').trim());
        slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

        page(`/deck/${deckID}/${slugged}`);

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

    changeCurrentDeckByID: co.wrap(function* (state, deckID, callback = void 0) {

        const currentDeck = yield co(function*() {

            // fetch deck
            const {decksResponse} = yield new Promise(function(resolve) {
                superhot
                    .get(`/decks/${deckID}`)
                    .end(function(err, res){
                        resolve({decksErr: err, decksResponse: res});
                    });
            });

            if(decksResponse.status != 200) {
                return NOT_SET;
            }

            // TODO: error handling here

            return decksResponse.body;
        });

        if(currentDeck === NOT_SET) {
            page.redirect(`/`);
            return;
        }

        const ImmCurrentDeck = Immutable.fromJS(currentDeck);

        // inject currently viewed deck from REST API into app state
        state.cursor(paths.currentDeck).update(function() {

            // invariant: currentDeck is a plain object
            return ImmCurrentDeck;
        });

        if(callback) {
            callback.call(null, ImmCurrentDeck);
            return;
        }

        let slugged = slugify(currentDeck.name.trim());
        slugged = slugged.length <= 0 ? `deck-${deckID}` : slugged;

        page.redirect(`/deck/${deckID}/${slugged}`);
    }),

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
    },

    saveDeck(state, newDeck) {

    }
};

module.exports = transforms;
