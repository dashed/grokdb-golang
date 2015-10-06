const React = require('react');
const minitrue = require('minitrue');
const {Probe} = require('minitrue');
const once = require('react-prop-once');
const orwell = require('orwell');
const _ = require('lodash');

const GenericStash = require('./generic');
const {stash} = require('store/constants');
const {toStash} = require('store/route');
const {flow} = require('store/utils');
const {createNewStash} = require('store/stashes');

const saveNewStash = flow(
    // stashes
    createNewStash,

    // route
    toStash
);

const StashNew = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        const {localstate} = this.props;

        localstate.cursor(['display', 'mode', stash.view.description]).update(function() {
            return stash.display.source;
        });
    },

    onClickAdd(newStash) {

        if(!newStash.name || !_.isString(newStash.name) || newStash.name.trim().length <= 0) {
            return;
            // TODO: error handling
        }

        this.props.store.invoke(saveNewStash, {
            newStash
        });
    },

    render() {
        const {localstate} = this.props;

        return (
            <GenericStash
                onCommit={this.onClickAdd}
                localstate={localstate}
            />
        );
    }
});

const OrwellWrappedStashNew= orwell(StashNew, {
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

// local state
module.exports = once(OrwellWrappedStashNew, {
    assignPropsOnMount() {

        const localstate = minitrue({
            showEditButton: false,
            hideStashCards: true,
            editMode: true,
            hideMeta: true,
            commitLabel: 'Add New Stash'
        });

        return {
            localstate: localstate
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
    }
});


