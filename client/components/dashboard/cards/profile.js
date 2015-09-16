const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {paths} = require('store/constants');
const CardVisual = require('./visual');
const CardModify = require('./modify');

const CardProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        isEditing: React.PropTypes.bool.isRequired
    },

    render() {

        // TODO: modify component

        const {card, isEditing} = this.props;

        if(!isEditing) {
            return (
                <CardVisual
                    title={card.get('title')}
                    description={card.get('description')}
                    sides={JSON.parse(card.get('sides'))}
                />
            );
        }

        return (
            <CardModify />
        );
    }
});

module.exports = orwell(CardProfile, {
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

