const _ = require('lodash');
const Immutable = require('immutable');
const superhot = require('store/superhot');

const DataLoader = require('dataloader');

module.exports = {
    deckLoader: new DataLoader(function(keys) {

        const decks = keys.join(',');

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks`)
                .query({ 'decks': decks })
                .end(function(err, res){
                    switch(res.status) {
                    case 200:
                        return resolve(res.body);
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }
                });
        });
    }),

    deckChildrenLoader: new DataLoader(function(keys) {
        const maybeChildren = _.map(keys, function(deckID) {
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
        });

        return Promise.all(maybeChildren);
    })
};
