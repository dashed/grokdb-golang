const minitrue = require('minitrue');
const {Probe} = minitrue;
const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const once = require('react-prop-once');
const co = require('co');
const _ = require('lodash');

const {paths} = require('store/constants');
const {fetchDeck} = require('store/stateless/decks');

const CardChild = require('./child');

const CardsChildren = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        listCursor: React.PropTypes.instanceOf(Probe).isRequired,
        breadcrumbLength: React.PropTypes.number.isRequired
    },

    render() {
        const {list} = this.props;

        const display = (function() {

            if(list.size <= 0) {
                return (
                    <div className="card">
                        <div className="card-block text-center">
                            <p className="card-text text-muted">
                                {"No cards to display. To get started, you should create your first card for this deck."}
                            </p>
                        </div>
                    </div>
                );
            }

            const {listCursor, localstate, breadcrumbLength} = this.props;

            // display list of cards

            const currentChildrenRendered = listCursor.reduce(function(accumulator, childCursor) {
                accumulator.push(
                    <CardChild
                        key={childCursor.deref().get('id')}
                        localstate={localstate}
                        breadcrumbLength={breadcrumbLength}
                        childCursor={childCursor}
                    />
                );

                return accumulator;
            }, []);

            return (
                <ul className="list-group">
                    {currentChildrenRendered}
                </ul>
            );
        }.call(this));

        return (
            <div>
                {display}
            </div>
        );
    }
});

const OrwellWrappedCardsChildren = orwell(CardsChildren, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.cards.list),
            state.cursor(paths.deck.breadcrumb)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        const breadcrumbLength = state.cursor(paths.deck.breadcrumb).deref().size || 1;

        return {
            store: store,
            listCursor: state.cursor(paths.dashboard.cards.list),
            breadcrumbLength: breadcrumbLength
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

const NOT_SET = {};

// local state
module.exports = once(OrwellWrappedCardsChildren, {
    contextTypes: {
        store: React.PropTypes.object.isRequired
    },
    assignPropsOnMount() {

        const localstate = minitrue({
            cachedDecks: {}, // map deck id to deck obj
            deckPaths: {} // map card id to array of decks
        });

        // TODO: this is a hack and need a better way
        // TODO: move this somewhere

        const requestDeckPath = co.wrap(function*(cardID, deckPathIterator) {

            let deckPathBuild = deckPathIterator.reduce(function(_deckPathBuild, deckID) {

                let maybeDeck = localstate.cursor(['cachedDecks', deckID]).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // mark as unfound

                    const index = _deckPathBuild.deckPath.length;

                    _deckPathBuild.unfound.push(co(function*() {

                        const result = yield fetchDeck({deckID});

                        localstate.cursor(['cachedDecks', deckID]).update(function() {
                            return result.deck;
                        });

                        return {
                            index: index,
                            deck: result.deck
                        };

                    }));
                }

                _deckPathBuild.deckPath.push(maybeDeck);

                return _deckPathBuild;
            }, {
                deckPath: [],
                unfound: []
            });

            const resolved = yield deckPathBuild.unfound;

            _.each(resolved, function(result) {
                deckPathBuild.deckPath[result.index] = result.deck;
            });

            localstate.cursor(['deckPaths', cardID]).update(function() {
                return deckPathBuild.deckPath;
            });
        });

        localstate.cursor('requestDeckPath').update(function() {
            return requestDeckPath;
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {

        const {localstate} = cachedProps;

        localstate.removeListeners('any');
    }
});
