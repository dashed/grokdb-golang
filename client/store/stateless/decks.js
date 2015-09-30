const Immutable = require('immutable');
const superhot = require('store/superhot');

const transforms = {

    /* requests from REST */

    fetchDeck(inputs) {

        // TODO: ensure
        const {deckID} = inputs;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}`)
                .end(function(err, res){
                    switch(res.status) {
                    case 404:
                        return reject(err);
                        break;
                    case 200:
                        return resolve({
                            deck: Immutable.fromJS(res.body),
                            deckID: res.body.id
                        });
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }
                });
        });
    },

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

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/children`)
                .end(function(err, res){

                    // no children
                    if (res.status === 404) {
                        return resolve({children: Immutable.List()});
                    }

                    if (res.status === 200) {
                        resolve({children: Immutable.fromJS(res.body)});
                    }

                    // TODO: error handling
                    reject(err);
                });
        });
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
