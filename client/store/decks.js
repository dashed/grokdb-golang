const page = require('page');
const Immutable = require('immutable');
const co = require('co');
const slugify = require('slug');
const _ = require('lodash');

const {NOT_SET, paths} = require('store/constants');
const superhot = require('store/superhot');
const {setEditingDeck} = require('store/dashboard');

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

    saveDeck: co.wrap(function*(state, patchDeck, callback) {

        if(!_.isPlainObject(patchDeck)) {
            // TODO: error here
            return;
        }

        const deckID = state.cursor(paths.currentDeck).deref().get('id');

        // fetch deck
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/decks/${deckID}`)
                .send(patchDeck)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');
        }

        state.cursor(paths.currentDeck).update(function(deck) {
            if(_.has(patchDeck, 'name')) {
                deck = deck.set('name', patchDeck.name);
            }

            if(_.has(patchDeck, 'description')) {
                deck = deck.set('description', patchDeck.description);
            }

            return deck;
        });

        if(callback) {
            callback.call(void 0);
        }

        // get out of editing mode
        setEditingDeck(state, false);
    }),

    deleteDeck: co.wrap(function*(state, bool) {
        if(!bool) {
            return;
        }

        const deck = state.cursor(paths.currentDeck).deref();

        // fetch parent
        if(!deck.get('hasParent', false)) {
            return;
        }

        const deckID = deck.get('id');
        const parentID = deck.get('parent');


        yield new Promise(function(resolve) {
            superhot
                .del(`/decks/${deckID}`)
                .end(function() {
                    resolve();
                });
        });

        // go to parent
        page(`/deck/${parentID}`);
    })
};

module.exports = transforms;
