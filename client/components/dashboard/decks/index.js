const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');

const {NOT_LOADED, paths} = require('store/constants');

// components
const Spinner = require('components/spinner');
const DeckChildren = require('./children');
const DecksListControls = require('./listcontrols');
const DeckSettings = require('./settings');

const DecksDashboard = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        editingDeck: React.PropTypes.bool.isRequired
    },

    render() {

        const {deck, editingDeck} = this.props;

        // components for when editing
        const editingHeader = (function() {
            if (!editingDeck) {
                return null;
            }
            return (
                <div className="card-header">
                    {"Editing Name & Description"}
                </div>
            );
        }());

        return (
            <div className="card">
                {editingHeader}
                <div className="card-block">
                    <h4 className="card-title">{deck.get('name')}</h4>
                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
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

    if(NOT_LOADED === props.deck) {
        return false;
    }

    if(NOT_LOADED === props.currentChildrenCursor.deref()) {
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
