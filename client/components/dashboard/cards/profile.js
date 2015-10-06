const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const once = require('react-prop-once');
const minitrue = require('minitrue');
const {Probe} = require('minitrue');

const {flow} = require('store/utils');
const {paths, cards, NOT_SET} = require('store/constants');
const {applyCardArgs, saveCard, deleteCard, setCard} = require('store/cards');
const {toCardProfileEdit, toCardProfile, redirectToDeckCards} = require('store/route');

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

const CardProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isEditing: React.PropTypes.bool.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        this.loadCard(this.props);
        this.resolveEdit(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.resolveEdit(nextProps, this.props);
    },

    loadCard(props) {
        const {localstate, card} = props;

        localstate.cursor('card').update(Immutable.Map(), function(map) {
            return map.mergeDeep(card);
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

    render() {

        const {localstate} = this.props;

        return (
            <GenericCard
                onClickCancelEdit={this.onClickCancelEdit}
                onClickEdit={this.onClickEdit}
                onCommit={this.onClickSave}
                onClickDelete={this.onClickDelete}
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
            state.cursor(paths.card.self)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            card: state.cursor(paths.card.self).deref(),
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

