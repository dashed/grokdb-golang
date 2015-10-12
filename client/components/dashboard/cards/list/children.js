const minitrue = require('minitrue');
const {Probe} = minitrue;
const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const once = require('react-prop-once');
const co = require('co');
const _ = require('lodash');

const {fetchDeck} = require('store/stateless/decks');

const CardChild = require('./child');

const CardsChildren = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        sublocalstate: React.PropTypes.instanceOf(Probe).isRequired, // hacky localstate
        listCursor: React.PropTypes.instanceOf(Probe).isRequired,
        breadcrumbLength: React.PropTypes.number.isRequired,
        noCardsString: React.PropTypes.string.isRequired
    },

    render() {
        const {list} = this.props;

        const display = (function() {

            if(list.size <= 0) {

                const {noCardsString} = this.props;

                return (
                    <div className="card">
                        <div className="card-block text-center">
                            <p className="card-text text-muted">
                                {noCardsString}
                            </p>
                        </div>
                    </div>
                );
            }

            const {listCursor, localstate, sublocalstate, breadcrumbLength} = this.props;

            // display list of cards

            const currentChildrenRendered = listCursor.reduce(function(accumulator, childCursor) {

                const key = `${childCursor.deref().get('id')}-${accumulator.length}`;

                accumulator.push(
                    <CardChild
                        key={key}
                        localstate={localstate}
                        sublocalstate={sublocalstate}
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
    watchCursors(props) {

        const {localstate} = props;

        return [
            localstate.cursor('list'),
            localstate.cursor('breadcrumb'),
            localstate.cursor('noCardsString')
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;
        const breadcrumbLength = localstate.cursor('breadcrumb').deref(Immutable.List).size || 1;
        const listCursor = localstate.cursor('list');
        return {
            listCursor: listCursor,
            list: listCursor.deref(),
            breadcrumbLength: breadcrumbLength,
            noCardsString: localstate.cursor('noCardsString').deref()
        };
    }
});

const NOT_SET = {};

// local state
module.exports = once(OrwellWrappedCardsChildren, {
    assignPropsOnMount() {

        const sublocalstate = minitrue({
            cachedDecks: {}, // map deck id to deck obj
            deckPaths: {} // map card id to array of decks
        });

        // TODO: this is a hack and need a better way
        // TODO: move this somewhere

        const requestDeckPath = co.wrap(function*(cardID, deckPathIterator) {

            let deckPathBuild = deckPathIterator.reduce(function(_deckPathBuild, deckID) {

                let maybeDeck = sublocalstate.cursor(['cachedDecks', deckID]).deref(NOT_SET);

                if(maybeDeck === NOT_SET) {
                    // mark as unfound

                    const index = _deckPathBuild.deckPath.length;

                    _deckPathBuild.unfound.push(co(function*() {

                        const result = yield fetchDeck({deckID});

                        sublocalstate.cursor(['cachedDecks', deckID]).update(function() {
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

            sublocalstate.cursor(['deckPaths', cardID]).update(function() {
                return deckPathBuild.deckPath;
            });
        });

        sublocalstate.cursor('requestDeckPath').update(function() {
            return requestDeckPath;
        });

        return {
            sublocalstate: sublocalstate
        };
    },

    cleanOnUnmount(cachedProps) {

        const {sublocalstate} = cachedProps;

        sublocalstate.removeListeners('any');
    }
});
