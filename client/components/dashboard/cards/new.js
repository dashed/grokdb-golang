const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const once = require('react-prop-once');
const minitrue = require('minitrue');
const _ = require('lodash');

const {flow} = require('store/utils');
const {createNewCard} = require('store/cards');
const {toDeckCards} = require('store/route');
const {applyDeckArgs} = require('store/decks');
const {cards} = require('store/constants');

const GenericCard = require('./generic');

const saveNewCard = flow(

    // decks
    applyDeckArgs,

    // cards
    createNewCard,

    // route
    toDeckCards
);

const CardNew = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onClickAdd(newCard) {

        if(!newCard.title || !_.isString(newCard.title) || newCard.title.trim().length <= 0) {
            return;
            // TODO: error handling
        }

        this.props.store.invoke(saveNewCard, {
            newCard
        });
    },

    render() {

        const {localstate} = this.props;

        return (
            <GenericCard
                onCommit={this.onClickAdd}
                localstate={localstate}
            />
        );
    }
});

const OrwellWrappedNewCard = orwell(CardNew, {
    assignNewProps(props, context) {

        const store = context.store;

        return {
            store: store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

// local state
module.exports = once(OrwellWrappedNewCard, function assignPropsOnMount() {

    const localstate = minitrue({
        editMode: true,
        hideMeta: true,
        defaultMode: cards.display.source,
        commitLabel: 'Add New Card'
    });

    return {
        localstate: localstate
    };
}, function cleanOnUnmount(cachedProps) {
    cachedProps.localstate.removeListeners('any');
});

