const React = require('react');
const orwell = require('orwell');
// const either = require('react-either');

// const {NOT_SET, paths} = require('store/constants');
const {toDeckCardsNew} = require('store/route');

const CardsChildren = require('./children');

const CardsList = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    onClickNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;

        store.dispatch(toDeckCardsNew);
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={this.onClickNewCard}>New Card</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsChildren />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(CardsList, {
    // watchCursors(props, manual, context) {
    //     const state = context.store.state();

    //     return [
    //         state.cursor(paths.dashboard.decks.creatingNew),
    //         state.cursor(paths.dashboard.decks.editing)
    //     ];
    // },
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

