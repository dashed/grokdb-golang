const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const minitrue = require('minitrue');
const {Probe} = require('minitrue');
const once = require('react-prop-once');

const {flow} = require('store/utils');
const {paths, stash} = require('store/constants');
const {toStashProfileEdit, toStashProfile} = require('store/route');
const {applyStashCardsPageArgs} = require('store/cards');
const {applyStashArgs, saveStash} = require('store/stashes');

const GenericStash = require('./generic');

const saveStashState = flow(
    applyStashCardsPageArgs,
    applyStashArgs,
    saveStash,

    // route
    toStashProfile
);

const StashProfile = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isEditing: React.PropTypes.bool.isRequired,
        stash: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        stashCards: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {
        this.loadStash(this.props, {});
        this.loadStashCards(this.props, {});
        this.resolveEdit(this.props, {});
    },

    componentWillReceiveProps(nextProps) {
        this.loadStash(nextProps, this.props);
        this.loadStashCards(nextProps, this.props);
        this.resolveEdit(nextProps, this.props);
    },

    loadStash(nextProps, oldProps) {
        const {localstate, stash: newStash} = nextProps;
        const {stash: oldStash} = oldProps;

        if(newStash === oldStash) {
            return;
        }

        localstate.cursor('stash').update(Immutable.Map(), function(map) {
            return map.mergeDeep(newStash);
        });
    },

    loadStashCards(nextProps, oldProps) {
        const {localstate, stashCards: newStashCards} = nextProps;
        const {stashCards: oldStashCards} = oldProps;

        if(newStashCards === oldStashCards) {
            return;
        }

        localstate.cursor('stashCards').update(function() {
            return newStashCards;
        });
    },

    resolveEdit(props, prevProps = {}) {

        const {localstate, isEditing} = props;
        localstate.cursor('editMode').update(function() {
            return isEditing;
        });

        // going into edit mode
        if(isEditing && isEditing != prevProps.isEditing) {

            // go to description tab by force

            localstate.cursor(['display', 'mode', stash.view.description]).update(function() {
                return stash.display.source;
            });
            localstate.cursor(['display', 'view']).update(function() {
                return stash.view.description;
            });
        }

        // going out of edit mode
        if(!isEditing && isEditing != prevProps.isEditing) {
            localstate.cursor(['display', 'mode', stash.view.description]).update(function() {
                return stash.display.render;
            });
        }
    },

    onClickEdit() {
        const {store} = this.props;
        store.invoke(flow(applyStashArgs, applyStashCardsPageArgs, toStashProfileEdit));
    },

    onClickCancelEdit() {
        const {store, stash: currentStash} = this.props;

        store.invoke(flow(applyStashArgs, applyStashCardsPageArgs, toStashProfile), {
            stash: currentStash,
            stashID: currentStash.get('id')
        });
    },

    onClickSave(newStash) {
        const {store} = this.props;

        if(newStash.name.length <= 0) {
            return;
        }

        store.invoke(saveStashState, {patchStash: newStash});
    },

    render() {
        const {localstate} = this.props;

        return (
            <GenericStash
                onClickCancelEdit={this.onClickCancelEdit}
                onClickEdit={this.onClickEdit}
                onCommit={this.onClickSave}
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
            state.cursor(paths.stash.self),
            state.cursor(paths.stash.cards)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            stash: state.cursor(paths.stash.self).deref(),
            stashCards: state.cursor(paths.stash.cards).deref(Immutable.List()),
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
