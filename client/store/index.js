const minitrue = require('minitrue');
const bootstrap = require('./bootstrap');
const {NOT_LOADED} = require('./constants');

const SCHEMA = {

    // ideally, react-router should be awesome at this
    route: NOT_LOADED,

    // deck id for root
    root: NOT_LOADED,

    // currently viewed deck
    currentDeck: {
        self: NOT_LOADED,
        children: NOT_LOADED,
        breadcrumb: NOT_LOADED
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
    transformer.bind(null, this._state).apply(null, args);
};

module.exports = bootstrap(new Store());
