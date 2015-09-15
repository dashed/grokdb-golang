const markdown = require('markdown-it')();

module.exports = {

    // sentinel value
    NOT_SET: Symbol('NOT_SET'),

    markdown: markdown,

    /* magic constants */

    // paths on the app state
    paths: {

        route: {
            handler: ['route', 'handler'],

            params: {
                deck: {
                    id: ['route', 'params', 'deck', 'id']
                },
                card: {
                    id: ['route', 'params', 'card', 'id']
                }
            }
        },

        root: ['root'],

        deck: {
            self: ['deck', 'self'],
            children: ['deck', 'children'],
            breadcrumb: ['deck', 'breadcrumb']
        },

        // ui flags
        dashboard: {
            view: ['dashboard', 'view'],
            decks: {
                editing: ['dashboard', 'decks', 'editing'],
                finishEditing: ['dashboard', 'decks', 'finishEditing'],
                creatingNew: ['dashboard', 'decks', 'creatingNew']
            },
            cards: {
                editing: ['dashboard', 'cards', 'editing'],
                finishEditing: ['dashboard', 'cards', 'finishEditing'],
                creatingNew: ['dashboard', 'cards', 'creatingNew']
            }
        }
    },

    dashboard: {
        view: {
            decks: 'decks',
            cards: 'cards'
        }
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
