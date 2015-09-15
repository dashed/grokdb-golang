const React = require('react');
const orwell = require('orwell');

const CardModify = require('./modify');
const {createNewCard} = require('store/cards');

const CardNew = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    onClickAdd(newCard) {
        this.props.store.dispatch(createNewCard, newCard);
    },

    render() {
        return (
            <CardModify
                onCommit={this.onClickAdd}
                commitLabel={"Add New Card"}
            />
        );
    }
});

module.exports = orwell(CardNew, {
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
