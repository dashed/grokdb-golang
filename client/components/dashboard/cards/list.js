const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');

const {NOT_SET, paths} = require('store/constants');

const CardsChildren = require('./children');
const SortDropdown = require('./dropdown');

const CardsList = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    render() {

        const {list} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <div className="card m-y-0">
                            <div className="card-block p-a clearfix">
                                <div className="row">
                                    <div className="col-sm-4">
                                        <input type="text" className="form-control form-control-sm" placeholder="Search" />
                                    </div>
                                    <div className="col-sm-8">
                                        <SortDropdown />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsChildren list={list} />
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

