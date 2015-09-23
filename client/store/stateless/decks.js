const Immutable = require('immutable');
const superhot = require('store/superhot');
const co = require('co');

const transforms = {
    fetchDeck: co.wrap(function*(inputs) {

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

    })
};

module.exports = transforms;
