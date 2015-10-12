const Immutable = require('immutable');
const co = require('co');
const superhot = require('store/superhot');

const {deckLoader, deckChildrenLoader} = require('store/loader');

const transforms = {

    /* requests from REST */

    fetchDeck: co.wrap(function*(inputs) {

        // TODO: ensure
        const {deckID} = inputs;

        const deck = yield deckLoader.load(deckID);

        return {
            deck: Immutable.fromJS(deck),
            deckID: deck.id
        };
    }),

    fetchRootDeck() {

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/root`)
                .end(function(err, res) {
                    switch(res.status) {
                    case 200:
                        return resolve({
                            deckID: res.body.id
                        });
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }
                });
        });
    },

    fetchChildren(inputs) {

        // TODO: ensure
        const {deckID} = inputs;

        return deckChildrenLoader.load(deckID);
    },

    fetchAncestors(inputs) {

        // TODO: ensure
        const {deckID} = inputs;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/ancestors`)
                .end(function(err, res){

                    if (res.status === 404) {
                        return resolve({ancestors: Immutable.List()});
                    } else if(res.status === 200) {
                        return resolve({ancestors: Immutable.fromJS(res.body)});
                    }

                    reject(err);
                });
        });
    }

};

module.exports = transforms;
