const markdown = require('markdown-it')();

module.exports = {

    markdown: markdown,

    // sentinel value
    NOT_SET: Symbol('NOT_SET'),

    /* magic constants */

    // paths on the app state
    paths: {
        // route: ['route'],
        routeHandler: ['routeHandler'],
        root: ['root'],
        currentDeck: ['currentDeck', 'self'],
        currentChildren: ['currentDeck', 'children'],
        breadcrumb: ['currentDeck', 'breadcrumb'],
        editingDeck: ['editingDeck'],
        creatingNewDeck: ['creatingNewDeck'],

        editingDeckCallback: ['editingDeckCallback']
    },

    // config settings used to get/post on REST API
    configs: {
        route: 'route',
        currentDeck: 'currentDeck',
        breadcrumb: 'breadcrumb'
    },

    // magic constants
    keypress: {
        enter: 13
    }
};
