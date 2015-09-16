const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const _ = require('lodash');

const {paths} = require('store/constants');
const {saveCard} = require('store/cards');

const CardVisual = require('./visual');
const CardModify = require('./modify');

const CardProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        isEditing: React.PropTypes.bool.isRequired
    },

    getInitialState() {

        const {card} = this.props;
        const sides = JSON.parse(card.get('sides'));

        return {
            title: card.get('title'),
            description: card.get('description'),
            sides: sides
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

    onClickSave(newCard) {
        this.props.store.dispatch(saveCard, {
            title: newCard.title,
            sides: JSON.stringify(newCard.sides),
            description: newCard.description
        });
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
            <CardModify
                onCommit={this.onClickSave}

                onChangeTitle={this.onChangeTitle}
                title={this.state.title}

                onChangeDescription={this.onChangeDescription}
                description={this.state.description}

                onChangeSides={this.onChangeSides}
                sides={this.state.sides}

                commitLabel={"Save Card"}
            />
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

