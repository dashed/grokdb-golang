const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');
const {Probe} = require('minitrue');

const {NOT_LOADED, paths} = require('store/constants');

// components
const Spinner = require('components/spinner');
const DeckChild = require('./deckchild');

const DecksList = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        currentChildrenCursor: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {

        const {deck, currentChildrenCursor} = this.props;

        const currentChildrenRendered = currentChildrenCursor.reduce(function(accumulator, childCursor, indexKey) {
            accumulator.push(
                <li className="list-group-item" key={indexKey}>
                    <DeckChild childCursor={childCursor} />
                </li>
            );

            return accumulator;
        }, []);

        return (
            <div className="card">
                <div className="card-block">
                    <h4 className="card-title">{deck.get('name')}</h4>
                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                    <p className="card-text text-right"><a href="#">Edit</a></p>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                        <button type="button" className="btn btn-success">New Deck</button>
                        <button type="button" className="btn btn-secondary">Edit Description</button>
                    </div>
                </div>
                <ul className="list-group list-group-flush">
                    {currentChildrenRendered}
                </ul>
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
            state.cursor(paths.currentDeck)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            deck: state.cursor(paths.currentDeck).deref(),
            currentChildrenCursor: state.cursor(paths.currentChildren)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
}).debug(true);

