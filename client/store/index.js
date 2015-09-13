const minitrue = require('minitrue');
const bootstrap = require('./bootstrap');
const {NOT_SET} = require('./constants');

const SCHEMA = {

    // ideally, react-router should be awesome at this
    // route: NOT_SET,
    routeHandler: NOT_SET,

    // deck id for root
    root: NOT_SET,

    // currently viewed deck
    currentDeck: {
        self: NOT_SET,
        children: NOT_SET,
        breadcrumb: NOT_SET
    },

    // flags
    editingDeck: false,
    creatingNewDeck: false,

    // callbacks
    editingDeckCallback: NOT_SET
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
