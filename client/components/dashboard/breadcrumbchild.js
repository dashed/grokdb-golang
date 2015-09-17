const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {flow} = require('store/utils');
const {setDeck, loadChildren, popFromBreadcrumb, applyDeckArgs} = require('store/decks');
const {toDeck} = require('store/route');

const changeToBreadcrumb = flow(

    // decks
    applyDeckArgs,
    popFromBreadcrumb,
    function(state, options) {
        options.deck = options.toDeck;
        options.deckID = options.toDeckID;
        return options;
    },
    setDeck,
    loadChildren,

    // route
    toDeck
);

const BreadcrumbChild = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        store: React.PropTypes.object.isRequired,
        active: React.PropTypes.bool
    },

    getDefaultProps() {
        return {
            active: false
        };
    },

    onClick(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store, deck} = this.props;
        store.invoke(changeToBreadcrumb, {toDeck: deck, toDeckID: deck.get('id')});

    },

    render() {

        const {deck} = this.props;

        const name = deck.get('name');
        const href = `#${deck.get('id')}/${name}`;

        if(this.props.active) {
            return (
                <li className="active">{name}</li>
            );
        }

        return (
            <li>
                <a key="a" href={href} onClick={this.onClick}>{name}</a>
            </li>
        );
    }
});

module.exports = orwell(BreadcrumbChild, {

    assignNewProps(props, context) {
        return {
            store: context.store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
