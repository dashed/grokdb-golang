const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {navigatetoCard} = require('store/cards');

const CardChild = React.createClass({

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        store: React.PropTypes.object.isRequired
    },

    onClickCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {card, store} = this.props;

        store.dispatch(navigatetoCard, {card});
    },

    render() {

        const {card} = this.props;
        const title = card.get('title');

        return (
            <a href="#" onClick={this.onClickCard}>{title}</a>
        );
    }
});

module.exports = orwell(CardChild, {
    // watchCursors(props, manual) {

    //     manual(function(update) {
    //         const unsubscribe = props.childCursor.observe(function(newValue, oldValue) {
    //             if(newValue && oldValue && newValue.id === oldValue.id) {
    //                 return update();
    //             }
    //         });

    //         return unsubscribe;
    //     });
    // },
    assignNewProps(props, context) {
        return {
            card: props.childCursor.deref(),
            store: context.store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
