const slugify = require('slug');
const _ = require('lodash');
const co = require('co');

module.exports = {
    generateSlug(name, id) {
        let slugged = slugify(name.trim());
        return slugged.length <= 0 ? `deck-${id}` : slugged;
    },

    // TODO: update docs
    // - Creates a function that invokes the provided transforms [which are just functions] from left to right.
    // - The arguments passed to the created function will be provided to the first transform starting from the second argument.
    // - Each invoked function is provided with the store's state in the first argument.
    // - Each successive invocation of the transform is supplied the return values of the previous starting from the second argument.
    // - If the return value of the transform is an array, then it will be spread onto the next available transform.
    // - If the return value of the transform is not an array, then will be converted into an array containing that value; then appropriately
    //   spread onto the next transform.
    // - Transforms may return a promise which shall be resolved into a value.
    // - The created function is thenable to be passed outputs (if any) of the last transform invoked.
    flow(...transformers) {

        const len = transformers.length;

        return function(state, ...args) {
            return co(function*() {

                let idx = 0;
                while(idx < len) {
                    let fn = transformers[idx];
                    fn = _.spread(_.wrap(state, fn));

                    args = yield Promise.resolve(fn(args));
                    args = !_.isArray(args) ? [args] : args;

                    idx++;
                }

                return Promise.resolve(args);

            }).catch(function(err) {
                // TODO: proper error handling
                console.error(err);
                throw Error(err);
            });
        };

    }
};
