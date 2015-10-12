const either = require('react-either');
const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const {Probe} = require('minitrue');
const minitrue = require('minitrue');
const once = require('react-prop-once');

const {flow} = require('store/utils');
const {NOT_SET, paths} = require('store/constants');
const {setCard, applyStashCardsPageArgs} = require('store/cards');
const {toCardProfile, toStashProfile} = require('store/route');

const GenericCardsList = require('components/dashboard/cards/list');

const changeToCard = flow(

    // cards
    setCard,

    // route
    toCardProfile
);


const GenericStashCards = React.createClass({

    propTypes: {
        sublocalstate: React.PropTypes.instanceOf(Probe).isRequired,
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        breadcrumb: React.PropTypes.instanceOf(Immutable.List).isRequired,
        currentPage: React.PropTypes.number.isRequired,
        sort: React.PropTypes.string.isRequired,
        order: React.PropTypes.string.isRequired
    },

    componentWillMount() {
        this.loadList(this.props, {});
        this.loadBreadcrumb(this.props, {});
        this.loadPageProps(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.loadList(nextProps, this.props);
        this.loadBreadcrumb(nextProps, this.props);
        this.loadPageProps(nextProps, this.props);
    },

    loadPageProps(nextProps, oldProps) {

        const {
            sublocalstate,
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
            sublocalstate.cursor('currentPage').update(function() {
                return newCurrentPage;
            });
        }

        if(newSort != oldSort) {
            sublocalstate.cursor('sort').update(function() {
                return newSort;
            });
        }

        if(newOrder != oldOrder) {
            sublocalstate.cursor('order').update(function() {
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

        const {sublocalstate} = nextProps;

        sublocalstate.cursor('breadcrumb').update(function() {
            return newBreadcrumb;
        });
    },

    loadList(nextProps, oldProps) {

        const {list: newList} = nextProps;
        const {list: oldList} = oldProps;

        if(!Immutable.List.isList(newList) || newList === oldList) {
            return;
        }

        const {sublocalstate} = nextProps;

        sublocalstate.cursor('list').update(function() {
            return newList;
        });
    },

    render() {

        const {sublocalstate} = this.props;

        return (
            <GenericCardsList
                localstate={sublocalstate}
            />
        );
    }
});

// don't show until all data dependencies are satisfied
const CardsListOcclusion = either(GenericStashCards, null, function(props) {

    if(!Immutable.List.isList(props.list)) {
        return false;
    }

    if(!Immutable.List.isList(props.breadcrumb)) {
        return false;
    }

    return true;
});

// local state for cardslist
const StashCardsOnce = once(CardsListOcclusion, {
    assignPropsOnMount(props) {

        const {store} = props;

        const sublocalstate = minitrue({

            noCardsString: 'No cards to display. Add some to this stash.',

            // routes
            changeToCard: function(options) {

                const {card, cardID} = options;

                const switchToCard = flow(
                    function(state, _options) {

                        state.cursor(paths.dashboard.cards.fromCardProfile).update(function() {

                            const stash = state.cursor(paths.stash.self).deref();
                            const __options = {
                                stash: stash,
                                stashID: stash.get('id')
                            };

                            return function() {
                                store.invoke(flow(
                                    applyStashCardsPageArgs,
                                    toStashProfile
                                ), __options);
                            };
                        });

                        return _options;
                    },
                    changeToCard
                );

                store.invoke(switchToCard, {card, cardID});
            },

            afterCardsListSort: function(options) {

                const {pageNum, sort, order} = options;

                // route to execute on cards list sort
                store.invoke(toStashProfile, {pageNum, sort, order});
            },

            afterCardsListPageChange: NOT_SET,

            afterCardsListDeckChange: function(options) {
                const {flowPath, deck, deckID, decks} = options;
                const boundflow = flow(
                    flowPath,

                    // route
                    applyStashCardsPageArgs,
                    toStashProfile
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
            sublocalstate: sublocalstate
        };
    },
    cleanOnUnmount(cachedProps) {
        cachedProps.sublocalstate.removeListeners('any');
    }
});

module.exports = orwell(StashCardsOnce, {
    watchCursors(props, manual, context) {
        const {localstate} = props;
        const store = context.store;
        const state = store.state();

        return [
            localstate.cursor('stashCards'),
            state.cursor(paths.deck.breadcrumb),
            state.cursor(paths.dashboard.stashes.page),
            state.cursor(paths.dashboard.stashes.sort),
            state.cursor(paths.dashboard.stashes.order)
        ];
    },
    assignNewProps(props, context) {

        const {localstate} = props;
        const store = context.store;
        const state = store.state();

        return {
            store,
            list: localstate.cursor('stashCards').deref(Immutable.List()),
            breadcrumb: state.cursor(paths.deck.breadcrumb).deref(Immutable.List()),
            currentPage: state.cursor(paths.dashboard.stashes.page).deref(1),
            sort: state.cursor(paths.dashboard.stashes.sort).deref('reviewed_at'),
            order: state.cursor(paths.dashboard.stashes.order).deref('DESC')
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

