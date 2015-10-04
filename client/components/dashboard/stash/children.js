const React = require('react');
const Immutable = require('immutable');
const orwell = require('orwell');
const {Probe} = require('minitrue');

const {paths} = require('store/constants');
const StashChild = require('./child');

const StashesChildren = React.createClass({

    propTypes: {
        listCursor: React.PropTypes.instanceOf(Probe).isRequired,
        list: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    render() {

        const {list} = this.props;

        const display = (function() {

            if(list.size <= 0) {
                return (
                    <div className="card">
                        <div className="card-block text-center">
                            <p className="card-text text-muted">
                                {"No stashes to display. To get started, you should create your first stash."}
                            </p>
                        </div>
                    </div>
                );
            }

            const {listCursor} = this.props;

            // display list of stashes

            const currentChildrenRendered = listCursor.reduce(function(accumulator, childCursor) {
                accumulator.push(
                    <StashChild
                        key={childCursor.deref().get('id')}
                        childCursor={childCursor}
                    />
                );

                return accumulator;
            }, []);

            return (
                <ul className="list-group">
                    {currentChildrenRendered}
                </ul>
            );
        }.call(this));

        return (
            <div>
                {display}
            </div>
        );
    }
});

module.exports = orwell(StashesChildren, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.stashes.list)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        const list = state.cursor(paths.dashboard.stashes.list);

        return {
            store: store,
            listCursor: list,
            list: list.deref(Immutable.List())
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
