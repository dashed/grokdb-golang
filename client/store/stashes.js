const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const superhot = require('store/superhot');
const {paths} = require('store/constants');

const transforms = {

    applyStashArgs(state, options = {}) {

        const stash = state.cursor(paths.stash.self).deref();
        const stashID = stash.get('id');

        options.stash = stash;
        options.stashID = stashID;

        return options;
    },

    applyStashReviewArgs(state, options = {}) {

        const card = state.cursor(paths.stash.review).deref();
        const cardID = card.get('id');

        options.card = card;
        options.cardID = cardID;

        return options;
    },

    setStashList(state, options = {}) {
        const {stashList} = options;

        state.cursor(paths.dashboard.stashes.list).update(function() {
            return stashList;
        });

        return options;
    },

    setStash(state, options = {}) {
        const {stash} = options;

        state.cursor(paths.stash.self).update(function() {
            return stash;
        });

        return options;
    },

    setStashCards(state, options = {}) {
        const {stashCards} = options;

        state.cursor(paths.stash.cards).update(function() {
            return stashCards;
        });

        return options;
    },

    setStashReviewCard(state, options = {}) {

        const {reviewStashCard} = options;

        state.cursor(paths.stash.review).update(function() {
            return reviewStashCard;
        });

        return options;
    },

    createNewStash: co.wrap(function*(state, options) {
        const {newStash} = options;

        return new Promise(function(resolve) {
            superhot
                .post(`/stashes`)
                .type('json')
                .send({
                    name: newStash.name,
                    description: newStash.description
                })
                .end(function(err, res) {

                    // TODO: error handling
                    if(res.status != 201) {
                        throw Error('bad');
                    }

                    options.stash = Immutable.fromJS(res.body);
                    options.stashID = res.body.id;

                    return resolve(options);
                });
        });
    }),

    saveStash: co.wrap(function*(state, options) {

        const {patchStash} = options;

        if(!_.isPlainObject(patchStash)) {
            // TODO: error here
            throw Error('bad patch');
            return void 0;
        }

        let willChange = true;

        // optimistic update
        state.cursor(paths.stash.self).update(function(stash) {

            const oldStash = stash;

            if(_.has(patchStash, 'name')) {
                stash = stash.update('name', function() {
                    return patchStash.name;
                });
            }

            if(_.has(patchStash, 'description')) {
                stash = stash.update('description', function() {
                    return patchStash.description;
                });
            }

            willChange = oldStash != stash;

            return stash;
        });

        if(!willChange) {
            return options;
        }

        const {stashID} = options;

        // save deck
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/stashes/${stashID}`)
                .send(patchStash)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');

            // TODO: revert optimistic update
        }

        options.stash = state.cursor(paths.stash.self).deref();

        return options;
    })
};

module.exports = transforms;
