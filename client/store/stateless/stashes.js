const Immutable = require('immutable');

const superhot = require('store/superhot');

const transforms = {

    fetchStash(inputs) {
        const {stashID} = inputs;

        // fetch stash
        return new Promise(function(resolve, reject) {
            superhot
                .get(`/stashes/${stashID}`)
                .end(function(err, res){
                    switch(res.status) {
                    case 404:
                        return reject(err);
                        break;
                    case 200:
                        return resolve({
                            stash: Immutable.fromJS(res.body),
                            stashID: res.body.id
                        });
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }

                    // TODO: error handling
                    resolve({err: err, response: res});
                });
        });
    },

    fetchStashList() {
        return new Promise(function(resolve, reject) {
            superhot
                .get(`/stashes`)
                .end(function(err, res){
                    switch(res.status) {
                    case 404:
                        resolve({stashList: Immutable.List()});
                        break;
                    case 200:
                        return resolve({
                            stashList: Immutable.fromJS(res.body)
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
