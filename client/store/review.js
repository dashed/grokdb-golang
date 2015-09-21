const Immutable = require('immutable');
const co = require('co');

const superhot = require('store/superhot');
const {difficulty, NOT_SET, paths} = require('store/constants');

const transforms = {

    applyReviewArgs(state, options = {}) {

        const card = state.cursor(paths.review.self).deref();
        const cardID = card.get('id');

        options.card = card;
        options.cardID = cardID;

        return options;
    },

    validateReviewInput(state, options = {}) {

        if(options.skip === true) {
            options.patchReviewCard = {
                action: 'skip',
                changelog: 'Skipped card'
            };
            return options;
        }

        if(!validDifficulty(options.difficulty)) {
            // TODO: err handling
            throw Error('bad');
        }

        options.patchReviewCard = {
            action: difficultyToAction(options.difficulty),
            value: difficultyToValue(options.difficulty),
            changelog: difficultyToLog(options.difficulty)
        };

        return options;
    },

    patchReview: co.wrap(function *(state, options = {}) {

        const {cardID, patchReviewCard} = options;

        // send review patch
        const {response} = yield new Promise(function(resolve) {
            superhot
                .patch(`/cards/${cardID}/review`)
                .send(patchReviewCard)
                .end(function(err_, res_){
                    resolve({err: err_, response: res_});
                });
        });

        // TODO: error handling here
        if(response.status != 200) {
            console.error('omg error');

            // TODO: revert optimistic update
        }

        return options;
    }),

    nextReview: co.wrap(function* (state, options = {}) {

        const {deckID} = options;

        // fetch next card to review
        const {response} = yield new Promise(function(resolve) {
            superhot
                .get(`/decks/${deckID}/review`)
                .end(function(err, res){
                    // TODO: error handling
                    resolve({err: err, response: res});
                });
        });

        // TODO: error handling

        const reviewCard = response.status == 404 ? NOT_SET : Immutable.fromJS(response.body);

        state.cursor(paths.review.self).update(function() {
            return reviewCard;
        });

        return options;
    })
};

module.exports = transforms;

/* helpers */

const validDifficulty = function(d) {
    switch(d) {
    case difficulty.forgot:
    case difficulty.hard:
    case difficulty.fail:
    case difficulty.good:
    case difficulty.easy:
        return true;
    }

    return false;
};

const difficultyToAction = function(d) {
    switch(d) {
    case difficulty.forgot:
        return 'forgot';

    case difficulty.hard:
    case difficulty.fail:
        return 'fail';

    case difficulty.good:
    case difficulty.easy:
        return 'success';
    }

    throw Error('bad input');
};

const difficultyToValue = function(d) {
    switch(d) {
    case difficulty.forgot:
        return 0; // noop

    case difficulty.hard:
        return 4;

    case difficulty.fail:
        return 1;

    case difficulty.good:
        return 1;

    case difficulty.easy:
        return 3;
    }

    throw Error('bad input');
};

const difficultyToLog = function(d) {
    switch(d) {
    case difficulty.forgot:
        return 'Forgot the card';

    case difficulty.hard:
        return 'The card was hard';

    case difficulty.fail:
        return 'Unable to answer the card';

    case difficulty.good:
        return 'Answered the card';

    case difficulty.easy:
        return 'The card was easy';
    }

    throw Error('bad input');
};
