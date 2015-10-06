const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const once = require('react-prop-once');
const minitrue = require('minitrue');
const {Probe} = require('minitrue');

const {flow, stateless} = require('store/utils');
const {paths, cards, NOT_SET} = require('store/constants');
const {applyCardArgs, saveCard, deleteCard, setCard} = require('store/cards');
const {toCardProfileEdit, toCardProfile, redirectToDeckCards} = require('store/route');
const {addCardToStash, removeCardFromStash, setStashList} = require('store/stashes');
const {fetchStashList} = require('store/stateless/stashes');

const GenericCard = require('./generic');

const saveCardState = flow(
    // cards
    applyCardArgs,
    saveCard,

    // route
    toCardProfile
);

const invokeDeleteCard = flow(
    // cards
    applyCardArgs,
    deleteCard,
    function(state, options) {
        options.card = NOT_SET;
        return options;
    },
    setCard,

    // route
    redirectToDeckCards
);

const __addCardToStash = flow(

    addCardToStash,

    stateless(fetchStashList),
    setStashList
);

const __removeCardFromStash = flow(

    removeCardFromStash,

    stateless(fetchStashList),
    setStashList
);


const CardProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isEditing: React.PropTypes.bool.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        stashes: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        this.loadCard(this.props, {});
        this.loadStashes(this.props, {});
        this.resolveEdit(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.loadCard(nextProps, this.props);
        this.loadStashes(nextProps, this.props);
        this.resolveEdit(nextProps, this.props);
    },

    loadStashes(nextProps, oldProps) {

        const {localstate, stashes: newStashes} = nextProps;
        const {stashes: oldStashes} = oldProps;

        if(newStashes === oldStashes) {
            return;
        }

        localstate.cursor('stashes').update(function() {
            return newStashes;
        });
    },

    loadCard(nextProps, oldProps) {

        const {localstate, card: newCard} = nextProps;
        const {card: oldCard} = oldProps;

        if(newCard === oldCard) {
            return;
        }

        localstate.cursor('card').update(function() {
            return newCard;
        });
    },

    resolveEdit(props, prevProps = {}) {
        const {localstate, isEditing} = props;
        localstate.cursor('editMode').update(function() {
            return isEditing;
        });

        localstate.cursor('defaultMode').update(function() {
            return isEditing ? cards.display.source : cards.display.render;
        });

        const {isEditing: previsEditing = false} = prevProps;

        localstate.cursor(['display', 'mode']).update(Immutable.Map(), function(val) {
            return previsEditing == isEditing ? val : Immutable.Map();
        });
    },

    onClickEdit() {

        const {isEditing, store, card} = this.props;

        if(isEditing) {
            store.invoke(toCardProfile, {card, cardID: card.get('id')});
            return;
        }

        store.invoke(toCardProfileEdit, {card: this.props.card});
    },

    onClickCancelEdit() {

        const {store, card} = this.props;

        this.loadCard(this.props);
        store.invoke(toCardProfile, {card, cardID: card.get('id')});
    },

    onClickSave(newCardRecord) {

        if(newCardRecord.title.length <= 0) {
            return;
        }

        this.props.store.invoke(saveCardState, {patchCard: newCardRecord});
    },

    onClickDelete() {
        this.props.store.invoke(invokeDeleteCard);
    },

    onClickAddStash(stash) {

        const {store, card} = this.props;

        store.invoke(__addCardToStash, {
            card,
            cardID: card.get('id'),
            stash,
            stashID: stash.get('id')
        });
    },

    onClickDeleteStash(stash) {

        const {store, card} = this.props;

        store.invoke(__removeCardFromStash, {
            card,
            cardID: card.get('id'),
            stash,
            stashID: stash.get('id')
        });
    },

    render() {

        const {localstate} = this.props;

        return (
            <GenericCard
                onClickCancelEdit={this.onClickCancelEdit}
                onClickEdit={this.onClickEdit}
                onCommit={this.onClickSave}
                onClickDelete={this.onClickDelete}
                onClickAddStash={this.onClickAddStash}
                onClickDeleteStash={this.onClickDeleteStash}
                localstate={localstate}
            />
        );
    }
});

const OrwellWrappedCardProfile = orwell(CardProfile, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.card.editing),
            state.cursor(paths.card.self),
            state.cursor(paths.dashboard.stashes.list)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            card: state.cursor(paths.card.self).deref(Immutable.Map()),
            stashes: state.cursor(paths.dashboard.stashes.list).deref(Immutable.List()),
            isEditing: state.cursor(paths.card.editing).deref(false)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

// local state
module.exports = once(OrwellWrappedCardProfile, {
    assignPropsOnMount() {

        const localstate = minitrue({
            showEditButton: true,
            editMode: false,
            hideMeta: false,
            showDelete: true,
            commitLabel: 'Save Card'
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
    }
});

