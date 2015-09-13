const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');

// components
const Spinner = require('components/spinner');
const DeckChildren = require('./children');
const DecksListControls = require('./listcontrols');
const DeckSettings = require('./settings');
const DeckInfo = require('./deckinfo');

const DecksDashboard = React.createClass({

    propTypes: {
        editingDeck: React.PropTypes.bool.isRequired
    },

    render() {

        const {editingDeck} = this.props;

        // components for when editing
        const editingHeader = (function() {
            if (!editingDeck) {
                return null;
            }
            return (
                <div className="card-header">
                    <strong>{"Editing Name & Description"}</strong>
                </div>
            );
        }());

        return (
            <div className="card">
                {editingHeader}
                <div className="card-block">
                    <DeckInfo />
                    <DecksListControls />
                </div>
                <DeckChildren />
                <DeckSettings />
            </div>
        );
    }
});

// show Spinner until all data dependencies are satisfied
const DecksListOcclusion = either(DecksDashboard, Spinner, function(props) {

    if(NOT_SET === props.deck) {
        return false;
    }

    if(NOT_SET === props.currentChildrenCursor.deref()) {
        return false;
    }

    return true;
});

module.exports = orwell(DecksListOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.currentChildren),
            state.cursor(paths.currentDeck),
            state.cursor(paths.editingDeck)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            deck: state.cursor(paths.currentDeck).deref(),
            currentChildrenCursor: state.cursor(paths.currentChildren),
            editingDeck: state.cursor(paths.editingDeck).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
