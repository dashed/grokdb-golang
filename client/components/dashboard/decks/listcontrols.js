const React = require('react');
const orwell = require('orwell');
const _ = require('lodash');

const {paths, keypress} = require('store/constants');
const {createNewDeck} = require('store/decks');
const {setEditingDeck, setNewDeck} = require('store/dashboard');

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

        store.dispatch(setNewDeck, !creatingNewDeck);
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

        store.dispatch(setEditingDeck, true);
    },

    onClickCancelEditingDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;

        store.dispatch(setEditingDeck, false);
    },

    addNewDeck() {

        const {newDeckName} = this.state;

        if(!newDeckName || !_.isString(newDeckName) || newDeckName.trim().length <= 0) {
            return;
        }

        const {store} = this.props;

        store.dispatch(createNewDeck, newDeckName);

        this.setState({
            newDeckName: ''
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

        const callback = this.props.store.state().cursor(paths.editingDeckCallback).deref();

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

        console.log('DecksListControls');

        if(!creatingNewDeck && !editingDeck) {
            return (
                <div className="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
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
                <div className="input-group input-group-sm">
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
                <div className="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
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
            state.cursor(paths.creatingNewDeck),
            state.cursor(paths.editingDeck)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            creatingNewDeck: state.cursor(paths.creatingNewDeck).deref(),
            editingDeck: state.cursor(paths.editingDeck).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
