const React = require('react');
const orwell = require('orwell');
const _ = require('lodash');

const {paths, keypress} = require('store/constants');
const {createNewDeck, loadDeck, applyDeckArgs, loadChildren} = require('store/decks');
const {setNewDeck} = require('store/dashboard');
const {toDeckSettings, toDeck} = require('store/route');
const {flow} = require('store/utils');

const makeNewDeck = flow(

    // decks
    applyDeckArgs,
    createNewDeck,
    applyDeckArgs,
    function(state, ...args) {

        return Promise.settle([
            Promise.resolve(loadDeck(state, ...args)),
            Promise.resolve(loadChildren(state, ...args))
        ]).then(function() {
            return Promise.resolve(args);
        });
    },

    // dashboard
    setNewDeck
);

const DecksListControls = React.createClass({

    getInitialState: function() {
        return {
            newDeckName: ''
        };
    },

    propTypes: {
        store: React.PropTypes.object.isRequired,
        creatingNewDeck: React.PropTypes.bool.isRequired,
        editingDeck: React.PropTypes.bool.isRequired
    },

    onClickNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store, creatingNewDeck} = this.props;

        store.invoke(setNewDeck, {
            value: !creatingNewDeck
        });
    },

    onChangeNewDeck(event) {
        this.setState({
            newDeckName: event.target.value
        });
    },

    onClickEditingDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;

        store.invoke(toDeckSettings);
    },

    onClickCancelEditingDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;

        store.invoke(toDeck);
    },

    addNewDeck() {

        const {newDeckName} = this.state;

        if(!newDeckName || !_.isString(newDeckName) || newDeckName.trim().length <= 0) {
            return;
        }

        const {store} = this.props;

        this.setState({
            newDeckName: ''
        });

        store.invoke(makeNewDeck, {

            newDeck: {
                name: newDeckName
            },

            // setnewdeck value
            value: false
        });
    },

    onClickAddNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        this.addNewDeck();
    },

    keypressNewDeck(event) {

        if(event.which !== keypress.enter) {
            return;
        }

        this.addNewDeck();
    },

    onClickSaveDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const callback = this.props.store.state().cursor(paths.dashboard.decks.finishEditing).deref();

        if(!_.isFunction(callback)) {
            return;
        }

        callback.call(void 0);
    },

    componentDidUpdate() {

        const {creatingNewDeck} = this.props;

        if(creatingNewDeck) {
            React.findDOMNode(this.refs.newdeck).focus();
        }

    },

    render() {

        const {creatingNewDeck, editingDeck} = this.props;

        if(!creatingNewDeck && !editingDeck) {
            return (
                <div key="foo" className="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
                    <div className="btn-group" role="group" aria-label="New Deck">
                        <button type="button" className="btn btn-success btn-sm" onClick={this.onClickNewDeck}>New Deck</button>
                    </div>
                    <div className="btn-group pull-right" role="group" aria-label="Edit Deck">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={this.onClickEditingDeck}>Edit</button>
                    </div>
                </div>
            );
        }

        if(creatingNewDeck) {
            return (
                <div key="bar" className="input-group input-group-sm">
                    <span className="input-group-btn">
                        <button className="btn btn-success" type="button" onClick={this.onClickAddNewDeck}>Add</button>
                    </span>
                    <input type="text" ref="newdeck" className="form-control" placeholder="Deck Name" onChange={this.onChangeNewDeck} value={this.state.newDeckName} onKeyDown={this.keypressNewDeck} />
                    <span className="input-group-btn">
                        <button className="btn btn-danger" type="button" onClick={this.onClickNewDeck}>Cancel</button>
                    </span>
                </div>
            );
        }

        if(editingDeck) {
            return (
                <div key="baz" className="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
                    <div className="btn-group" role="group" aria-label="New Deck">
                        <button type="button" className="btn btn-success btn-sm" onClick={this.onClickSaveDeck}>Save</button>
                    </div>
                    <div className="btn-group pull-right" role="group" aria-label="Edit Deck">
                        <button type="button" className="btn btn-danger btn-sm" onClick={this.onClickCancelEditingDeck}>Cancel</button>
                    </div>
                </div>
            );
        }
    }
});

module.exports = orwell(DecksListControls, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.decks.creatingNew),
            state.cursor(paths.dashboard.decks.editing)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            creatingNewDeck: state.cursor(paths.dashboard.decks.creatingNew).deref(),
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
