const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const once = require('react-prop-once');
const minitrue = require('minitrue');
const Immutable = require('immutable');
const co = require('co');

const {Probe} = minitrue;

const {flow, stateless} = require('store/utils');
const {setDeck, pushOntoBreadcrumb, setChildren, applyDeckArgs, createNewDeck, saveDeck} = require('store/decks');
const {fetchChildren, fetchDeck} = require('store/stateless/decks');
const {toDeck} = require('store/route');
const {NOT_SET, paths, decks} = require('store/constants');

// components
const GenericDeck = require('./generic');
// const DeckChildren = require('./children');
// const DecksListControls = require('./listcontrols');
// const DeckSettings = require('./settings');
// const DeckInfo = require('./deckinfo');

const navigateToChild = flow(

    // decks
    pushOntoBreadcrumb,
    setDeck,
    stateless(fetchChildren),
    setChildren,

    // route
    toDeck
);

const makeNewDeck = flow(

    // decks
    applyDeckArgs,
    // TODO: refactor this
    createNewDeck,
    applyDeckArgs, // restore current deck that's overriden by createNewDeck
    co.wrap(function*(state, options) {

        const {deckID} = options;

        const results = yield [
            fetchDeck({deckID}),
            fetchChildren({deckID})
        ];

        const {deck} = results[0];
        const {children} = results[1];

        options.deck = deck;
        options.children = children;

        return options;
    }),
    setDeck,
    setChildren
);

const saveDeckState = flow(
    // decks
    applyDeckArgs,
    saveDeck,

    // route
    toDeck
);

const DecksDashboard = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        editingDeck: React.PropTypes.bool.isRequired,
        children: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        this.loadDeck(this.props);
        // this.resolveEdit(this.props, {});
    },

    componentWillReceiveProps(nextProps) {

        const {localstate, deck, children} = nextProps;

        if(deck.get('id') != this.props.deck.get('id')) {
            localstate.update(function() {
                return Immutable.Map();
            });
        }

        localstate.cursor('deck').update(Immutable.Map(), function(map) {

            const overrides = Immutable.fromJS({
                name: deck.get('name'),
                description: deck.get('description')
            });

            return map.mergeDeep(overrides);
        });

        localstate.cursor('children').update(function() {
            return children;
        });

        // this.resolveEdit(nextProps, this.props);
    },

    loadDeck(props) {
        const {localstate, deck, children} = props;

        localstate.cursor('deck').update(Immutable.Map(), function(map) {

            const overrides = Immutable.fromJS({
                name: deck.get('name'),
                description: deck.get('description')
            });

            return map.mergeDeep(overrides);
        });

        localstate.cursor('children').update(function() {
            return children;
        });
    },

    onClickDeck(deck) {
        const id = deck.get('id', NOT_SET);

        if(id === NOT_SET) {
            return;
        }

        const {store} = this.props;

        store.invoke(navigateToChild, {deck, deckID: id});
    },

    onAddNewDeck(newDeckName) {

        const {store} = this.props;

        store.invoke(makeNewDeck, {
            newDeck: {
                name: newDeckName
            }
        });
    },

    onClickEdit() {

        const {localstate} = this.props;

        localstate.cursor(['display', 'mode', decks.view.description]).update(function() {
            return decks.display.source;
        });

        localstate.cursor('editMode').update(function() {
            return true;
        });

        localstate.cursor(['display', 'view']).update(function() {
            return decks.view.description;
        });
    },

    onClickCancelEdit() {
        const {localstate, deck} = this.props;

        localstate.cursor('editMode').update(function() {
            return false;
        });

        localstate.cursor(['deck', 'description']).update(function() {
            return deck.get('description');
        });

        localstate.cursor(['display', 'mode', decks.view.description]).update(function() {
            return decks.display.render;
        });
    },

    onSaveDeck(newDeck) {

        const {store, localstate} = this.props;

        store.invoke(saveDeckState, {patchDeck: newDeck});
        localstate.cursor('editMode').update(function() {
            return false;
        });
        localstate.cursor(['display', 'mode', decks.view.description]).update(function() {
            return decks.display.render;
        });
    },

    render() {

        const {editingDeck, localstate} = this.props;

        return (
            <GenericDeck
                onCommit={this.onSaveDeck}
                onClickEdit={this.onClickEdit}
                onClickCancelEdit={this.onClickCancelEdit}
                onClickDeck={this.onClickDeck}
                onAddNewDeck={this.onAddNewDeck}
                localstate={localstate}
            />
        );
    }
});

// don't show until all data dependencies are satisfied
const DecksDashboardOcclusion = either(DecksDashboard, null, function(props) {

    if(NOT_SET === props.deck) {
        return false;
    }

    if(!Immutable.List.isList(props.children)) {
        return false;
    }

    return true;
});

const OrwellWrappedDeckProfile = orwell(DecksDashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.deck.children),
            state.cursor(paths.deck.self),
            state.cursor(paths.dashboard.decks.editing)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            deck: state.cursor(paths.deck.self).deref(),
            children: state.cursor(paths.deck.children).deref(Immutable.List()),
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

// local state
module.exports = once(OrwellWrappedDeckProfile, {
    assignPropsOnMount() {

        const localstate = minitrue({
            // showEditButton: true,
            editMode: false,
            // hideMeta: false,
            // showDelete: true,
            commitLabel: 'Save Deck'
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
    }
});
