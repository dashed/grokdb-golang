const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');
const {Probe} = require('minitrue');

const {NOT_LOADED, paths} = require('store/constants');

// components
const Spinner = require('components/spinner');
const DeckChild = require('./deckchild');
const DecksListControls = require('./deckslistcontrols');

const DecksList = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        currentChildrenCursor: React.PropTypes.instanceOf(Probe).isRequired,
        editingDeck: React.PropTypes.bool.isRequired
    },

    render() {

        const {deck, currentChildrenCursor, editingDeck} = this.props;

        const childrenList = (function() {

            if (editingDeck) {
                return null;
            }

            const currentChildrenRendered = currentChildrenCursor.reduce(function(accumulator, childCursor, indexKey) {
                accumulator.push(
                    <li className="list-group-item" key={indexKey}>
                        <DeckChild childCursor={childCursor} />
                    </li>
                );

                return accumulator;
            }, []);

            return (
                <ul className="list-group list-group-flush">
                    {currentChildrenRendered}
                </ul>
            );
        }())

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
                {childrenList}
                <div className="card-header">
                    Settings
                </div>
                <div className="card-block">
                    <strong>Delete this deck</strong>
                    <p className="card-text">
                        Once you delete a deck, there is no going back. Please be certain.
                        <button type="button" className="btn btn-danger btn-sm pull-right">Delete this deck</button>
                    </p>
                </div>
            </div>
        );
    }
});

// show Spinner until all data dependencies are satisfied
const DecksListOcclusion = either(DecksList, Spinner, function(props) {

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
