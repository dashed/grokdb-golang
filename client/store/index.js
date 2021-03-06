const minitrue = require('minitrue');

const bootstrap = require('./bootstrap');
const {NOT_SET} = require('./constants');

const SCHEMA = {

    // map of keys (i.e. paths) to values to be committed
    transaction: NOT_SET,

    route: {
        // ideally, react-router should be awesome at this
        handler: NOT_SET
    },

    // ui flags
    dashboard: {
        view: NOT_SET,

        decks: {
            editing: false,

            // a callback function is set here, and will be called when exiting
            // editing mode when saving
            finishEditing: NOT_SET,

            creatingNew: false
        },

        cards: {

            // list
            page: 1,
            total: 0,
            numOfPages: 0,
            sort: NOT_SET,
            order: NOT_SET,
            list: NOT_SET,

            // functions to execute after a ui event
            fromCardProfile: NOT_SET, // route to execute on click 'back to list'

            creatingNew: false,
            viewingProfile: false
        },

        stashes: {
            list: NOT_SET,

            reviewing: false,
            creatingNew: false,
            viewingProfile: false
        }
    },

    // deck id for root
    root: NOT_SET,

    deck: {
        self: NOT_SET,
        children: NOT_SET,
        breadcrumb: NOT_SET
    },

    card: {
        // card profile
        editing: false,
        self: NOT_SET // currently viewed card
    },

    review: {
        self: NOT_SET
    },

    stash: {
        // stash profile
        editing: false,
        self: NOT_SET, // currently viewed stash
        cards: NOT_SET,
        review: NOT_SET // the card being reviewed for a stash
    }
};


function Store() {
    this._state = minitrue(SCHEMA);
}

Store.prototype.constructor = Store;

Store.prototype.state = function() {
    return this._state;
};

Store.prototype.invoke = function(transformer, ...args) {
    transformer.bind(void 0, this._state).apply(null, args);
};

module.exports = bootstrap(new Store());
