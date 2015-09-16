const minitrue = require('minitrue');
const bootstrap = require('./bootstrap');
const {NOT_SET} = require('./constants');

const SCHEMA = {

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
            list: NOT_SET,

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
    }
};


function Store() {
    this._state = minitrue(SCHEMA);
}

Store.prototype.constructor = Store;

Store.prototype.state = function() {
    return this._state;
};

Store.prototype.dispatch = function(transformer, ...args) {

    const ctx = {
        store: this
    };

    transformer.bind(ctx, this._state).apply(null, args);
};

module.exports = bootstrap(new Store());
