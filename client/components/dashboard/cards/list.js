const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');
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
                            onClick={this.onClickNewCard}>{"New Card"}</button>
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

// don't show until all data dependencies are satisfied
const CardsListOcclusion = either(CardsList, null, function(props) {

    if(NOT_SET === props.list) {
        return false;
    }

    return true;
});

module.exports = orwell(CardsListOcclusion, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.cards.list)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: store,
            list: state.cursor(paths.dashboard.cards.list).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

