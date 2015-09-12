const React = require('react');
const orwell = require('orwell');

// const {paths} = require('store/cownstants');

const CardsList = React.createClass({
    render() {

        return (
            <div className="card">
                <div className="card-block">
                    <h4 className="card-title">Cards</h4>
                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                    <p className="card-text text-right"><a href="#">Edit</a></p>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                        <button type="button" className="btn btn-secondary">New Deck</button>
                        <button type="button" className="btn btn-secondary">Edit Description</button>
                    </div>
                </div>
                <ul className="list-group list-group-flush">
                    <li className="list-group-item"><a href="#">sdasf as fasf </a></li>
                    <li className="list-group-item"><a href="#">sdasf as fasf </a></li>
                </ul>
            </div>
        );
    }
});

module.exports = orwell(CardsList, {
    watchCursors(/*props*/) {
        return [];
    },
    assignNewProps(props, context) {
        return {
            // deck: context.store.state().cursor(paths.currentDeck).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

