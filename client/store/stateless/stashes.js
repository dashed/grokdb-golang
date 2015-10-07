const Immutable = require('immutable');

const superhot = require('store/superhot');
const {NOT_SET} = require('store/constants');

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
    },

    fetchStashCardsCount(options) {
        const {stashID} = options;

        // get total count
        return new Promise(function(resolve) {
            superhot
                .get(`/stashes/${stashID}/cards/count`)
                .end(function(err, res){
                    resolve({cardsCount: res.body && res.body.total || 0});
                });
        });
    },

    fetchStashCards(options) {

        // TODO: move this constant
        const perPage = 25;

        const {stashID, pageNum, pageSort, pageOrder} = options;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/stashes/${stashID}/cards`)
                .query({ 'page': pageNum })
                .query({ 'per_page': perPage })
                .query({ 'sort': pageSort })
                .query({ 'order': pageOrder })
                .end(function(err, res){

                    switch(res.status) {
                    case 404:
                        resolve({stashCards: Immutable.List()});
                        break;
                    case 200:
                        resolve({stashCards: Immutable.fromJS(res.body)});
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }
                });
        });
    },

    fetchStashReviewCard(options) {
        const {stashID} = options;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/stashes/${stashID}/review`)
                .end(function(err, res){

                    switch(res.status) {
                    case 404:
                        resolve({reviewStashCard: NOT_SET});
                        break;
                    case 200:
                        resolve({
                            reviewStashCard: Immutable.fromJS(res.body)
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
