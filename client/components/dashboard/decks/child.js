const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {NOT_SET} = require('store/constants');
const {navigateChildDeck} = require('store/decks');

const DeckChild = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        store: React.PropTypes.object.isRequired
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store, deck} = this.props;

        const id = deck.get('id', NOT_SET);

        if(id === NOT_SET) {
            return;
        }

        store.dispatch(navigateChildDeck, deck);
    },

    render() {

        const {deck} = this.props;

        const name = deck.get('name');
        const id = deck.get('id');

        const href = `#${id}/${name}`;

        return (
            // TODO: change href to something more meaningful
            <a href={href} onClick={this.onClick}>{name}</a>
        );
    }
});

module.exports = orwell(DeckChild, {
    watchCursors(props, manual) {

        manual(function(update) {
            const unsubscribe = props.childCursor.observe(function(newValue, oldValue) {
                if(newValue && oldValue && newValue.id === oldValue.id) {
                    return update();
                }
            });

            return unsubscribe;
        });
    },
    assignNewProps(props, context) {
        return {
            deck: props.childCursor.deref(),
            store: context.store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
