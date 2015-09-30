const Immutable = require('immutable');
const _ = require('lodash');

const {paths} = require('store/constants');

const transforms = {
    setTransactions(predicate) {

        return function(state, options) {

            let transacs = predicate.call(void 0, state, options);

            if(!_.isArray(transacs)) {
                transacs = [transacs];
            }

            _.each(transacs, function(transac) {

                const {path, value} = transac;

                state.cursor(paths.transaction).update(function(map) {
                    return map.set(path, value);
                });

            });

            return options;
        };
    },

    commitTransaction(state, options) {
        const transaction = state.cursor(paths.transaction).deref(Immutable.Map());

        transaction.forEach(function(value, path) {

            state.cursor(path).update(function() {
                return value;
            });
        });

        return options;
    }
};

module.exports = transforms;
