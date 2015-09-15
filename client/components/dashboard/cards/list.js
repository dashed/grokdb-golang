const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');

const CardsChildren = require('./children');

const CardsList = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
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
            list: state.cursor(paths.dashboard.cards.list).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

