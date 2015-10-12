const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const minitrue = require('minitrue');
const Immutable = require('immutable');
const either = require('react-either');
const once = require('react-prop-once');

const {NOT_SET, paths} = require('store/constants');
const {toDeckCards} = require('store/route');
const {applyDeckCardsPageArgs} = require('store/cards');
const {flow} = require('store/utils');
const {setCard} = require('store/cards');
const {toCardProfile} = require('store/route');

const GenericCardsList = require('./list');

const changeToCard = flow(

    // cards
    setCard,

    // route
    toCardProfile
);

const CardsList = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        breadcrumb: React.PropTypes.instanceOf(Immutable.List).isRequired,
        currentDeck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        currentPage: React.PropTypes.number.isRequired,
        sort: React.PropTypes.string.isRequired,
        order: React.PropTypes.string.isRequired
    },

    componentWillMount() {
        this.loadList(this.props, {});
        this.loadCurrentDeck(this.props, {});
        this.loadBreadcrumb(this.props, {});
        this.loadPageProps(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.loadList(nextProps, this.props);
        this.loadCurrentDeck(nextProps, this.props);
        this.loadBreadcrumb(nextProps, this.props);
        this.loadPageProps(nextProps, this.props);
    },

    loadCurrentDeck(nextProps, oldProps) {

        const {
            localstate,
            currentDeck: newCurrentDeck
        } = nextProps;

        const {
            currentDeck: oldCurrentDeck
        } = oldProps;

        if(newCurrentDeck == oldCurrentDeck) {
            return;
        }

        localstate.cursor('currentDeck').update(function() {
            return newCurrentDeck;
        });
    },

    loadPageProps(nextProps, oldProps) {

        const {
            localstate,
            currentPage: newCurrentPage,
            sort: newSort,
            order: newOrder
        } = nextProps;
        const {
            currentPage: oldCurrentPage,
            sort: oldSort,
            order: oldOrder
        } = oldProps;

        if(newCurrentPage != oldCurrentPage) {
            localstate.cursor('currentPage').update(function() {
                return newCurrentPage;
            });
        }

        if(newSort != oldSort) {
            localstate.cursor('sort').update(function() {
                return newSort;
            });
        }

        if(newOrder != oldOrder) {
            localstate.cursor('order').update(function() {
                return newOrder;
            });
        }
    },

    loadBreadcrumb(nextProps, oldProps) {

        const {breadcrumb: newBreadcrumb} = nextProps;
        const {breadcrumb: oldBreadcrumb} = oldProps;

        if(!Immutable.List.isList(newBreadcrumb) || newBreadcrumb === oldBreadcrumb) {
            return;
        }

        const {localstate} = nextProps;

        localstate.cursor('breadcrumb').update(function() {
            return newBreadcrumb;
        });
    },

    loadList(nextProps, oldProps) {

        const {list: newList} = nextProps;
        const {list: oldList} = oldProps;

        if(!Immutable.List.isList(newList) || newList === oldList) {
            return;
        }

        const {localstate} = nextProps;

        localstate.cursor('list').update(function() {
            return newList;
        });
    },

    render() {

        const {localstate} = this.props;

        return (
            <GenericCardsList
                localstate={localstate}
            />
        );
    }
});

// don't show until all data dependencies are satisfied
const CardsListOcclusion = either(CardsList, null, function(props) {

    if(!Immutable.List.isList(props.list)) {
        return false;
    }

    return true;
});

// local state
const CardsListOnce = once(CardsListOcclusion, {
    assignPropsOnMount(props) {

        const {store} = props;

        const localstate = minitrue({
            // routes

            changeToCard: function(options) {

                const {card, cardID} = options;

                store.invoke(changeToCard, {card, cardID});
            },

            afterCardsListSort: function(options) {

                const {pageNum, sort, order} = options;

                // route to execute on cards list sort
                store.invoke(toDeckCards, {pageNum, sort, order});
            },

            afterCardsListPageChange: NOT_SET,

            afterCardsListDeckChange: function(options) {
                const {flowPath, deck, deckID, decks} = options;
                const boundflow = flow(
                    flowPath,

                    // route
                    applyDeckCardsPageArgs,
                    function(state, _options = {}) {
                        // reset the page when changing decks
                        _options.pageNum = 1;
                        return _options;
                    },
                    toDeckCards
                );

                store.invoke(boundflow, {
                    deck: deck,
                    deckID: deckID,
                    decks: decks // for pushManyOntoBreadcrumb
                });
            },

            afterCardsListSearch: NOT_SET // TODO: to be implemented
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
    }
});

module.exports = orwell(CardsListOnce, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.cards.list),
            state.cursor(paths.deck.breadcrumb),
            state.cursor(paths.dashboard.cards.page),
            state.cursor(paths.dashboard.cards.sort),
            state.cursor(paths.dashboard.cards.order),
            state.cursor(paths.deck.self)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            list: state.cursor(paths.dashboard.cards.list).deref(Immutable.List()),
            breadcrumb: state.cursor(paths.deck.breadcrumb).deref(Immutable.List()),
            currentPage: state.cursor(paths.dashboard.cards.page).deref(1),
            sort: state.cursor(paths.dashboard.cards.sort).deref('reviewed_at'),
            order: state.cursor(paths.dashboard.cards.order).deref('DESC'),
            currentDeck: state.cursor(paths.deck.self).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

