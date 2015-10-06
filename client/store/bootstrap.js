const page = require('page');
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');
const qs = require('qs');

const {flow, detour, stateless, filterInt} = require('store/utils');
const {NOT_SET, paths, dashboard} = require('store/constants');
const {fetchRootDeck, fetchDeck, fetchChildren, fetchAncestors} = require('store/stateless/decks');
const {setRootDeck, isCurrentDeck} = require('store/decks');
const {setTransactions, commitTransaction} = require('store/meta');
const {redirectToDeck, validDeckSlug, toDeckCards} = require('store/route');
const {parseDeckCardsPageNum, parseStashCardsPageNum, parseOrder, parseSort, fetchCardsCount, fetchCardsList, fetchCard} = require('store/stateless/cards');
const {isCurrentCard, applyCardArgs, applyDeckCardsPageArgs} = require('store/cards');
const {fetchReviewCardByDeck} = require('store/stateless/review');
const {fetchStashList, fetchStash, fetchStashCardsCount, fetchStashCards} = require('store/stateless/stashes');
const {setStashList} = require('store/stashes');

// route handler components
const Dashboard = require('components/dashboard');

const toDeckCardsList = flow(
    applyDeckCardsPageArgs,
    toDeckCards
);

const bootRouter = co.wrap(function* (store) {
    const state = store.state();

    page('*', function(ctx, next) {

        // begin state change transaction
        state.cursor(paths.transaction).update(function() {

            return Immutable.Map().withMutations(function(map) {
                map
                    // decks
                    .set(paths.dashboard.decks.editing, false)
                    .set(paths.dashboard.decks.finishEditing, NOT_SET)
                    .set(paths.deck.children, Immutable.List())

                    // cards
                    .set(paths.dashboard.cards.creatingNew, false)
                    .set(paths.dashboard.cards.page, 1)
                    .set(paths.dashboard.cards.viewingProfile, false)
                    .set(paths.review.self, NOT_SET)
                    .set(paths.dashboard.cards.fromCardProfile, function() {
                        store.invoke(toDeckCardsList);
                    })

                    // stashes
                    .set(paths.dashboard.stashes.creatingNew, false)
                    .set(paths.dashboard.stashes.viewingProfile, false)
                    .set(paths.stash.self, NOT_SET);
            });
        });

        return next();
    });

    // go to root deck by default
    page('/', function(/*ctx*/) {
        defaultRoute(state);
    });

    const __commitStateTransaction = _.bind(commitStateTransaction, void 0, store);
    const __ensureDeckRoute = _.bind(ensureDeckRoute, void 0, store);
    const __ensureCardsRoute = _.bind(ensureCardsRoute, void 0, store);
    const __ensureCurrentCardRoute = _.bind(ensureCurrentCardRoute, void 0, store);
    const __ensureDeckReviewRoute = _.bind(ensureDeckReviewRoute, void 0, store);
    const __ensureStashesRoute = _.bind(ensureStashesRoute, void 0, store);
    const __ensureCurrentStashRoute = _.bind(ensureCurrentStashRoute, void 0, store);

    page('/deck/:id', __ensureDeckRoute, function() {

        const deck = (function() {
            let maybeDeck = state.cursor(paths.transaction).deref().get(paths.deck.self, NOT_SET);

            if(maybeDeck === NOT_SET) {
                maybeDeck = state.cursor(paths.deck.self).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // TODO: error handling
                    throw Error('bad');
                }
            }

            return maybeDeck;
        }());

        redirectToDeck(state, {deck});
    });

    page('/deck/:id/:slug', __ensureDeckRoute, function(ctx, next) {

        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.decks)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/edit', __ensureDeckRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.decks)
                    .set(paths.dashboard.decks.editing, true)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/cards', __ensureDeckRoute, __ensureCardsRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.cards)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/deck/:id/:slug/cards/new', __ensureDeckRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.cards.creatingNew, true)
                    .set(paths.dashboard.view, dashboard.view.cards)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/card/:id', __ensureCurrentCardRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.card.editing, false)
                    .set(paths.dashboard.cards.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.cards)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/card/:id/edit', __ensureCurrentCardRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.card.editing, true)
                    .set(paths.dashboard.cards.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.cards)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/review/deck/:id', __ensureDeckReviewRoute, function(ctx, next) {
        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.view, dashboard.view.review)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/stashes', __ensureStashesRoute, function(ctx, next) {

        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.dashboard.stashes.viewingProfile, false)
                    .set(paths.dashboard.view, dashboard.view.stash)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/stashes/:id', __ensureCurrentStashRoute, function(ctx, next) {

        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.stash.editing, false)
                    .set(paths.dashboard.stashes.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.stash)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    page('/stashes/:id/edit', __ensureStashesRoute, function(ctx, next) {

        state.cursor(paths.transaction).update(function(map) {
            return map.withMutations(function(__map) {
                __map
                    .set(paths.stash.editing, true)
                    .set(paths.dashboard.stashes.viewingProfile, true)
                    .set(paths.dashboard.view, dashboard.view.stash)
                    .set(paths.route.handler, Dashboard);
            });
        });

        return next();
    }, __commitStateTransaction);

    // page('/review/card/:id', function(ctx, next) {

    //     rootCursor.cursor(paths.transaction).update(function(map) {
    //         return map.withMutations(function(__map) {
    //             __map
    //                 .set(paths.route.handler, Dashboard)
    //                 .set(paths.dashboard.view, dashboard.view.review);
    //         });
    //     });

    //     return next();
    // }, __commitStateTransaction);


    page.start({
        hashbang: true,
        click: false
    });
});

const bootDecks = co.wrap(function* (store) {
    const state = store.state();

    // cursors
    const deckCursor = state.cursor(paths.deck.self);

    // breadcrumb setup

    const breadcrumbLoader = co.wrap(function*(currentDeck) {

        const deckID = currentDeck.get('id');

        // TODO: error handling
        let {ancestors: breadcrumb} = yield fetchAncestors({deckID: deckID});
        breadcrumb = breadcrumb.push(currentDeck);

        const breadcrumbCursor = state.cursor(paths.deck.breadcrumb);

        // update tail as necessary
        deckCursor.observe(function(updatedDeck) {

            let shouldReload = false;
            const _deckID = updatedDeck.get('id');

            breadcrumbCursor.update(Immutable.List(), function(lst) {

                if(lst.size <= 0) {
                    return lst;
                }

                if(lst.last().get('id') == _deckID) {
                    return lst.set(-1, updatedDeck);
                }

                shouldReload = true;
                return lst;
            });

            if(!shouldReload) {
                return;
            }

            co(function*() {

                // reload breadcrumb
                // TODO: error handling
                let {ancestors: _breadcrumb} = yield fetchAncestors({deckID: _deckID});
                _breadcrumb = _breadcrumb.push(updatedDeck);

                breadcrumbCursor.update(function() {
                    return _breadcrumb;
                });
            });
        });

        breadcrumbCursor.update(function() {
            return breadcrumb;
        });
    });

    const maybeDeck = deckCursor.deref(NOT_SET);
    if(maybeDeck === NOT_SET) {
        deckCursor.once('any', function(currentDeck) {
            breadcrumbLoader(currentDeck);
        });
    } else {
        breadcrumbLoader(maybeDeck);
    }

    /* root deck setup */

    // fetch root deck config from REST
    const {deckID: rootDeckID} = yield fetchRootDeck();

    // set root deck onto app state
    setRootDeck(state, {deckID: rootDeckID});
});

module.exports = function(store) {

    co(function* () {

        // connect to REST API

        yield [
            bootDecks(store),
            bootRouter(store)
        ];

    }).catch(function(err) {
        // TODO: proper error logging
        console.error(err);
        console.error(err.stack);
    });

    return store;
};

/* helpers */

const defaultRouteHandler = function(rootID) {
    page.redirect(`/deck/${rootID}`);
};

const defaultRoute = function(state) {
    const cursor = state.cursor(paths.root);

    if(cursor.deref(NOT_SET) === NOT_SET) {
        cursor.once('any', function(rootID) {
            defaultRouteHandler(rootID);
        });
        return;
    }

    defaultRouteHandler(cursor.deref());
};

// pipes for ensureDeckRoute

const ensureLoadDeck = detour(function(state, options = {}) {

    if(!options.isCurrentDeck) {
        return flow(
            stateless(fetchDeck),
            // meta
            setTransactions(function(_state, _options) {

                const {deck} = _options;
                return [
                    {
                        path: paths.deck.self,
                        value: deck
                    }
                ];
            })
        );
    }
});


const ensureLoadDeckChildren = detour(function(/*state*/) {

    return flow(
        stateless(fetchChildren),
        setTransactions(function(_state, options) {
            const {children} = options;

            return [
                {
                    path: paths.deck.children,
                    value: children
                }
            ];
        })
    );
});

const parseDeckID = flow(
    isCurrentDeck,
    ensureLoadDeck,
    ensureLoadDeckChildren,

    validDeckSlug,
    detour(function(state, options = {}) {

        if(!options.validDeckSlug) {
            return redirectToDeck;
        }
    })
);

// boilerplate for:
// - /deck/:id
// - /deck/:id/:slug
const ensureDeckRoute = co.wrap(function* (store, ctx, next) {

    const state = store.state();

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureDeckRoute used incorrectly');
    }

    if(notValidID(ctx.params.id)) {
        defaultRoute(state);
        return;
    }

    const slug = _.has(ctx.params, 'slug') ? ctx.params.slug : '';


    // parse and validate deck id; and load it as necessary
    try {
        yield parseDeckID(state, {deckID: ctx.params.id, slug: slug});
    } catch(err) {
        defaultRoute(state);
        return;
    }

    next();
    return;
});

// pipes for ensureCardsRoute

const loadCardsList = flow(

    co.wrap(function*(state, options) {

        const deckID = (function() {
            let maybeDeck = state.cursor(paths.transaction).deref().get(paths.deck.self, NOT_SET);

            if(maybeDeck === NOT_SET) {
                maybeDeck = state.cursor(paths.deck.self).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // TODO: error handling
                    throw Error('bad');
                }
            }

            if(!Immutable.Map.isMap(maybeDeck)) {
                // TODO: error handling
                throw Error('bad');
            }

            return maybeDeck.get('id', 0);
        }());

        options.pageNum = yield parseDeckCardsPageNum(deckID, options.pageNum);
        options.pageOrder = yield parseOrder(options.pageOrder);
        options.pageSort = yield parseSort(options.pageSort);
        return options;
    }),

    function(state, options) {

        const deckID = (function() {
            let maybeDeck = state.cursor(paths.transaction).deref().get(paths.deck.self, NOT_SET);

            if(maybeDeck === NOT_SET) {
                maybeDeck = state.cursor(paths.deck.self).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // TODO: error handling
                    throw Error('bad');
                }
            }

            return maybeDeck.get('id');
        }());

        options.deckID = deckID;

        return options;
    },

    stateless(fetchCardsCount), // for numOfPages

    // meta
    setTransactions(function(state, options) {

        // TODO: move this constant
        const perPage = 25;

        const {pageNum, cardsCount, pageSort, pageOrder} = options;
        return [
            {
                path: paths.dashboard.cards.page,
                value: (pageNum-1)*perPage >= cardsCount ? 1 : pageNum
            },
            {
                path: paths.dashboard.cards.numOfPages,
                value: Math.ceil(cardsCount / perPage)
            },
            {
                path: paths.dashboard.cards.sort,
                value: pageSort
            },
            {
                path: paths.dashboard.cards.order,
                value: pageOrder
            }
        ];
    }),

    stateless(fetchCardsList),
    setTransactions(function(_state, _options) {
        const {cardsList} = _options;
        return [
            {
                path: paths.dashboard.cards.list,
                value: cardsList
            }
        ];
    })
);

const ensureCardsRoute = co.wrap(function* (store, ctx, next) {

    const state = store.state();

    const queries = qs.parse(ctx.querystring);

    yield loadCardsList(state, {
        pageNum: queries.page,
        pageOrder: queries.order,
        pageSort: queries.sort
    });

    return next();
});

// pipes for ensureCurrentCardRoute
const parseCardID = flow(
    isCurrentCard,
    detour(function(state, options = {}) {

        if(!options.isCurrentCard) {
            return flow(
                stateless(fetchCard),
                setTransactions(function(_state, _options) {
                    const {card} = _options;
                    return [
                        {
                            path: paths.card.self,
                            value: card
                        }
                    ];
                })
            );
        } else {
            // load current card
            return applyCardArgs;
        }
    }),

    function(state, options) {

        // check if current loaded deck is ancestor (or the same) to card's parent deck
        const deckID = (function() {
            const maybeDeck = state.cursor(paths.deck.self).deref();

            if(!Immutable.Map.isMap(maybeDeck)) {
                return 0;
            }

            return maybeDeck.get('id', 0);
        }());

        const {card} = options;
        options.deckID = card.get('deck');

        if(deckID <= 0) {
            return options;
        }

        if(card.get('deck_path', Immutable.List()).indexOf(deckID) >= 0) {
            options.deckID = deckID;
        }

        return options;
    },
    isCurrentDeck,
    ensureLoadDeck,
    ensureLoadDeckChildren,
    loadCardsList
);

// boilerplate for:
// - /cards/:id
const ensureCurrentCardRoute = co.wrap(function* (store, ctx, next) {

    const state = store.state();

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureCurrentCardRoute used incorrectly');
    }

    if(notValidID(ctx.params.id)) {
        defaultRoute(state);
        return;
    }

    try {
        // parse and validate card id; and load it as necessary
        yield parseCardID(state, {cardID: ctx.params.id});
    } catch(err) {
        defaultRoute(state);
        return;
    }

    next();
    return;
});

const loadReviewCard = flow(
    isCurrentDeck,
    ensureLoadDeck,
    stateless(fetchReviewCardByDeck),
    setTransactions(function(state, options) {
        const {reviewCard} = options;
        return [
            {
                path: paths.review.self,
                value: reviewCard
            }
        ];
    })
);

// review on a deck and its children
const ensureDeckReviewRoute = co.wrap(function*(store, ctx, next) {

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureDeckRoute used incorrectly');
    }

    const state = store.state();

    const maybeID = filterInt(ctx.params.id);

    // ensure :id is valid
    if(notValidID(maybeID)) {
        defaultRoute(state);
        return;
    }

    try {
        yield loadReviewCard(state, {deckID: maybeID});
    } catch(err) {
        defaultRoute(state);
        return;
    }

    next();
    return;
});

const loadRoot = function(rootID) {
    return flow(
        function(state, options) {
            options.deckID = rootID;
            return options;
        },
        stateless(fetchDeck),
        setTransactions(function(_state, _options) {

            const {deck} = _options;
            return [
                {
                    path: paths.deck.self,
                    value: deck
                }
            ];
        }),
        stateless(fetchChildren),
        setTransactions(function(_state, options) {
            const {children} = options;

            return [
                {
                    path: paths.deck.children,
                    value: children
                }
            ];
        })
    );
};

const defaultDeck = detour(function(state/*, options = {}*/) {
    const deckcursor = state.cursor(paths.deck.self);

    if(!Immutable.Map.isMap(deckcursor.deref())) {

        return new Promise(function(resolve) {
            const cursor = state.cursor(paths.root);

            if(cursor.deref(NOT_SET) === NOT_SET) {
                cursor.once('any', function(rootID) {
                    resolve(loadRoot(rootID));
                });
                return;
            }

            resolve(loadRoot(cursor.deref()));
        });

    }
});

const loadStashList = flow(
    defaultDeck,
    stateless(fetchStashList),
    setStashList
);

const ensureStashesRoute = co.wrap(function*(store, ctx, next) {

    const state = store.state();

    try {
        yield loadStashList(state, {});
    } catch(err) {
        defaultRoute(state);
        return;
    }

    next();
    return;
});

const parseStashID = flow(

    defaultDeck, // load deck if it's not in app state

    // isCurrentStash,
    // ensureLoadStash,
    // ensureLoadStashCards,
    stateless(fetchStash),
    setTransactions(function(_state, _options) {
        const {stash} = _options;
        return [
            {
                path: paths.stash.self,
                value: stash
            }
        ];
    }),

    // load cards list
    co.wrap(function*(state, options) {

        const deckID = (function() {
            let maybeDeck = state.cursor(paths.transaction).deref().get(paths.deck.self, NOT_SET);

            if(maybeDeck === NOT_SET) {
                maybeDeck = state.cursor(paths.deck.self).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // TODO: error handling
                    throw Error('bad');
                }
            }

            if(!Immutable.Map.isMap(maybeDeck)) {
                // TODO: error handling
                throw Error('bad');
            }

            return maybeDeck.get('id', 0);
        }());

        options.pageNum = yield parseStashCardsPageNum(deckID, options.pageNum);
        options.pageOrder = yield parseOrder(options.pageOrder);
        options.pageSort = yield parseSort(options.pageSort);
        return options;
    }),
    stateless(fetchStashCardsCount),

    setTransactions(function(state, options) {

        // TODO: move this constant
        const perPage = 25;

        const {pageNum, cardsCount, pageSort, pageOrder} = options;
        return [
            {
                path: paths.dashboard.stashes.page,
                value: (pageNum-1)*perPage >= cardsCount ? 1 : pageNum
            },
            {
                path: paths.dashboard.stashes.numOfPages,
                value: Math.ceil(cardsCount / perPage)
            },
            {
                path: paths.dashboard.stashes.sort,
                value: pageSort
            },
            {
                path: paths.dashboard.stashes.order,
                value: pageOrder
            }
        ];
    }),

    stateless(fetchStashCards),
    setTransactions(function(_state, _options) {
        const {stashCards} = _options;
        return [
            {
                path: paths.stash.cards,
                value: stashCards
            }
        ];
    })
);

const ensureCurrentStashRoute = co.wrap(function*(store, ctx, next) {

    const state = store.state();

    if(!_.has(ctx.params, 'id')) {
        throw Error('ensureCurrentStashRoute used incorrectly');
    }

    if(notValidID(ctx.params.id)) {
        defaultRoute(state);
        return;
    }

    const queries = qs.parse(ctx.querystring);

    try {
        // parse and validate card id; and load it as necessary
        yield parseStashID(state, {
            stashID: ctx.params.id,
            pageNum: queries.page,
            pageOrder: queries.order,
            pageSort: queries.sort
        });

    } catch(err) {
        defaultRoute(state);
        return;
    }
    next();
    return;
});

const commitStateTransaction = function(store) {
    const state = store.state();
    commitTransaction.call(void 0, state, {});
};

const notValidID = function(id) {
    id = filterInt(id);
    return (_.isNaN(id) || !Number.isInteger(id) || id <= 0);
};
