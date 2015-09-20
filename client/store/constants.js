const markdown = require('markdown-it')();

module.exports = {

    // TODO: refactor?
    tabSize: {
        fontSize: '0.85rem'
    },

    // sentinel value
    NOT_SET: Symbol('NOT_SET'),

    difficulty: {
        forgot: Symbol('FORGOT'),
        hard: Symbol('HARD'),
        fail: Symbol('FAIL'),
        good: Symbol('GOOD'),
        easy: Symbol('EASY')
    },

    markdown: markdown,

    /* magic constants */

    // paths on the app state
    paths: {

        transaction: ['transaction'],

        route: {
            handler: ['route', 'handler']
        },

        root: ['root'],

        deck: {
            self: ['deck', 'self'],
            children: ['deck', 'children'],
            breadcrumb: ['deck', 'breadcrumb']
        },

        card: {
            // currently viewed card
            editing: ['card', 'editing'],
            self: ['card', 'self']
        },

        review: {
            self: ['review', 'self']
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
                finishEditing: ['dashboard', 'cards', 'finishEditing'],
                creatingNew: ['dashboard', 'cards', 'creatingNew'],
                viewingProfile: ['dashboard', 'cards', 'viewingProfile'],

                // list
                page: ['dashboard', 'cards', 'page'], // current page
                total: ['dashboard', 'cards', 'total'],
                numOfPages: ['dashboard', 'cards', 'numOfPages'],
                list: ['dashboard', 'cards', 'list']
            }
        }
    },

    dashboard: {
        view: {
            decks: 'decks',
            cards: 'cards',
            review: 'review'
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
