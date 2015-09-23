const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {NOT_SET} = require('store/constants');
const {flow} = require('store/utils');
const {setDeck, loadChildren, pushOntoBreadcrumb} = require('store/decks');
const {toDeck} = require('store/route');

const navigateToChild = flow(

    // decks
    setDeck,
    loadChildren,
    pushOntoBreadcrumb,

    // route
    toDeck
);

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

        store.invoke(navigateToChild, {deck, deckID: id});

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

        manual(function(update, isMounted) {


            const unsubscribe = props.childCursor.observe(function(newValue, oldValue) {

                if(!isMounted.call(void 0)) {
                    return unsubscribe();
                }

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
