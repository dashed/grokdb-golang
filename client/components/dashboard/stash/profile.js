const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const minitrue = require('minitrue');
const {Probe} = require('minitrue');
const once = require('react-prop-once');

const {paths, stash} = require('store/constants');

const GenericStash = require('./generic');

const StashProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isEditing: React.PropTypes.bool.isRequired,
        stash: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        this.loadStash(this.props);
        this.resolveEdit(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.resolveEdit(nextProps, this.props);
    },

    loadStash(props) {
        const {localstate, stash: newstash} = props;

        localstate.cursor('stash').update(Immutable.Map(), function(map) {
            return map.mergeDeep(newstash);
        });
    },

    resolveEdit(props, prevProps = {}) {
        const {localstate, isEditing} = props;
        localstate.cursor('editMode').update(function() {
            return isEditing;
        });

        localstate.cursor('defaultMode').update(function() {
            return isEditing ? stash.display.source : stash.display.render;
        });

        const {isEditing: previsEditing = false} = prevProps;

        localstate.cursor(['display', 'mode']).update(Immutable.Map(), function(val) {
            return previsEditing == isEditing ? val : Immutable.Map();
        });
    },

    render() {
        const {localstate} = this.props;

        return (
            <GenericStash
                // onClickCancelEdit={this.onClickCancelEdit}
                // onClickEdit={this.onClickEdit}
                // onCommit={this.onClickSave}
                // onClickDelete={this.onClickDelete}
                localstate={localstate}
            />
        );
    }
});

const OrwellWrappedStashProfile = orwell(StashProfile, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.stash.editing),
            state.cursor(paths.stash.self)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            stash: state.cursor(paths.stash.self).deref(),
            isEditing: state.cursor(paths.stash.editing).deref(false)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

// local state
module.exports = once(OrwellWrappedStashProfile, {
    assignPropsOnMount() {

        const localstate = minitrue({
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
    }
});
