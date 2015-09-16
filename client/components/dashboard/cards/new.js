const React = require('react');
const orwell = require('orwell');
const _ = require('lodash');

const CardModify = require('./modify');
const {createNewCard} = require('store/cards');

const CardNew = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState() {
        return {
            title: '',
            description: '',
            sides: {
                front: '',
                back: ''
            }
        };
    },

    onChangeTitle(newTitle) {
        this.setState({
            title: newTitle
        });
    },

    onChangeDescription(newDescription) {
        this.setState({
            description: newDescription
        });
    },

    onChangeSides(patch) {
        this.setState({
            sides: _.assign(this.state.sides, patch)
        });
    },

    onClickAdd(newCard) {
        this.props.store.dispatch(createNewCard, newCard);
    },

    render() {
        return (
            <CardModify
                onCommit={this.onClickAdd}

                onChangeTitle={this.onChangeTitle}
                title={this.state.title}

                onChangeDescription={this.onChangeDescription}
                description={this.state.description}

                onChangeSides={this.onChangeSides}
                sides={this.state.sides}

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
