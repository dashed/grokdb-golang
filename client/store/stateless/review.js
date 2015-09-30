const Immutable = require('immutable');

const superhot = require('store/superhot');
const {NOT_SET} = require('store/constants');

const transforms = {
    fetchReviewCardByDeck(inputs) {
        const {deckID} = inputs;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/review`)
                .end(function(err, res){
                    switch(res.status) {
                    case 404:
                        return resolve({
                            reviewCard: NOT_SET
                        });
                        break;
                    case 200:
                        return resolve({
                            reviewCard: Immutable.fromJS(res.body)
                        });
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }
                });
        });
    }
};

module.exports = transforms;
