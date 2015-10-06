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

        stash: {
            editing: ['stash', 'editing'],
            self: ['stash', 'self'],
            cards: ['stash', 'cards']
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
                fromCardProfile: ['dashboard', 'cards', 'fromCardProfile'],

                // list
                page: ['dashboard', 'cards', 'page'], // current page
                sort: ['dashboard', 'cards', 'sort'], // sort metric
                order: ['dashboard', 'cards', 'order'], // ASC or DESC
                total: ['dashboard', 'cards', 'total'],
                numOfPages: ['dashboard', 'cards', 'numOfPages'],
                list: ['dashboard', 'cards', 'list']
            },
            stashes: {
                creatingNew: ['dashboard', 'stashes', 'creatingNew'],
                viewingProfile: ['dashboard', 'stashes', 'viewingProfile'],

                // list
                page: ['dashboard', 'cards', 'page'], // current page
                sort: ['dashboard', 'cards', 'sort'], // sort metric
                order: ['dashboard', 'cards', 'order'], // ASC or DESC
                total: ['dashboard', 'cards', 'total'],
                numOfPages: ['dashboard', 'cards', 'numOfPages'],
                list: ['dashboard', 'stashes', 'list']
            }
        }
    },

    dashboard: {
        view: {
            decks: 'decks',
            cards: 'cards',
            review: 'review',
            stash: 'stash'
        }
    },

    cards: {

        view: {
            front: 'front',
            back: 'back',
            description: 'description',
            meta: 'meta'
        },

        display: {
            source: 'source',
            render: 'render'
        }
    },

    decks: {
        view: {
            subdecks: 'subdecks',
            description: 'description',
            meta: 'meta'
        },

        display: {
            source: 'source',
            render: 'render'
        }
    },

    stash: {
        view: {
            cards: 'cards',
            description: 'description',
            meta: 'meta'
        },

        display: {
            source: 'source',
            render: 'render'
        }
    },

    // magic constants
    keypress: {
        enter: 13
    }
};
