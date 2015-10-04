const React = require('react');
const Immutable = require('immutable');
const either = require('react-either');
const orwell = require('orwell');

const {NOT_SET, paths} = require('store/constants');
const StashesChildren = require('./children');

const StashesList = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    render() {
        const {list} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12 m-t">
                        <StashesChildren list={list} />
                    </div>
                </div>
            </div>
        );
    }
});

// don't show until all data dependencies are satisfied
const StashesListOcclusion = either(StashesList, null, function(props) {

    if(NOT_SET === props.list) {
        return false;
    }

    return true;
});

module.exports = orwell(StashesListOcclusion, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.stashes.list)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            list: state.cursor(paths.dashboard.stashes.list).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
