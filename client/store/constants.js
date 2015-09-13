module.exports = {

    // sentinel value
    NOT_LOADED: Symbol('NOT_LOADED'),

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
        creatingNewDeck: ['creatingNewDeck']
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
