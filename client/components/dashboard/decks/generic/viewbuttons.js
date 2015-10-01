const React = require('react');
const orwell = require('orwell');
const _ = require('lodash');
const classNames = require('classnames');
const {Probe} = require('minitrue');

const {decks, keypress} = require('store/constants');

const GenericDeckViewButtons = React.createClass({

    propTypes: {
        onClickEdit: React.PropTypes.func.isRequired,
        onClickCancelEdit: React.PropTypes.func.isRequired,
        onSwitchView: React.PropTypes.func.isRequired,
        view: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired,
        newDeckName: React.PropTypes.string.isRequired,
        creatingNew: React.PropTypes.bool.isRequired,
        onAddNewDeck: React.PropTypes.func.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onSwitchView(view) {

        const {onSwitchView, localstate} = this.props;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();

            localstate.cursor(['display', 'view']).update(function() {
                const ret = onSwitchView(view);
                return !ret ? view : ret;
            });
        };
    },

    onClickEditCancel(event) {
        event.preventDefault();
        event.stopPropagation();

        const {onClickEdit, editMode, onClickCancelEdit} = this.props;

        if(!editMode) {
            onClickEdit.call(void 0);
            return;
        }

        onClickCancelEdit.call(void 0);
    },

    onClickNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;

        localstate.cursor('creatingNew').update(function() {
            return true;
        });
    },

    keypressNewDeck(event) {

        if(event.which !== keypress.enter) {
            return;
        }

        this.addNewDeck();
    },

    onClickAddNewDeck(event) {
        event.preventDefault();
        event.stopPropagation();

        this.addNewDeck();
    },

    addNewDeck() {
        const {onAddNewDeck, localstate} = this.props;

        const newDeckName = localstate.cursor('newDeckName').deref('');

        onAddNewDeck.call(void 0, newDeckName);

        localstate.cursor('creatingNew').update(function() {
            return false;
        });
        localstate.cursor('newDeckName').update(function() {
            return '';
        });
    },

    onChangeNewDeckName(event) {

        const {localstate} = this.props;

        localstate.cursor('newDeckName').update(function() {
            return event.target.value;
        });
    },

    onClickCancelAdd(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;

        localstate.cursor('creatingNew').update(function() {
            return false;
        });
    },

    render() {

        const {creatingNew} = this.props;

        if(creatingNew) {

            const {newDeckName} = this.props;

            return (
                <div key="newdeck" className="card-block p-b-0">
                    <div key="bar" className="input-group input-group-sm">
                        <span className="input-group-btn">
                            <button className="btn btn-success" type="button" onClick={this.onClickAddNewDeck}>{"Add"}</button>
                        </span>
                        <input
                            type="text"
                            ref="newdeck"
                            className="form-control"
                            placeholder="Deck Name"
                            onChange={this.onChangeNewDeckName}
                            value={newDeckName}
                            onKeyDown={this.keypressNewDeck}
                        />
                        <span className="input-group-btn">
                            <button className="btn btn-danger" type="button" onClick={this.onClickCancelAdd}>{"Cancel"}</button>
                        </span>
                    </div>
                </div>
            );
        }


        const {view, editMode} = this.props;

        const Sides = _.reduce([
            {
                hide: false,
                view: decks.view.subdecks,
                label: 'Children'
            },
            {
                hide: false,
                view: decks.view.description,
                label: 'Description'
            },
        ], function(tabs, blueprint) {

            if(blueprint.hide) {
                return tabs;
            }

            tabs.push(
                <button
                    key={blueprint.view}
                    type="button"
                    className={classNames('btn', {
                        'btn-primary': view === blueprint.view,
                        'btn-secondary': view != blueprint.view
                    })}
                    onClick={this.onSwitchView(blueprint.view)}
                >{blueprint.label}</button>
            );

            return tabs;

        }, [], this);

        const EditCancelButton = (function() {

            return (
                <button
                    type="button"
                    className={classNames('btn', {
                        'btn-success': !editMode,
                        'btn-danger': editMode
                    })}
                    onClick={this.onClickEditCancel}
                >{editMode ? 'Cancel' : 'Edit'}</button>
            );
        }.call(this));

        const NewButton = (function() {

            if(editMode) {
                return null;
            }

            return (
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={this.onClickNewDeck}
                >{"New Deck"}</button>
            );

        }.call(this));

        return (
            <div key="viewbuttons" className="card-block p-b-0">
                <div className="btn-group btn-group-sm m-r" role="group" aria-label="Basic example">
                    {Sides}
                </div>
                <div className="btn-group btn-group-sm m-r" role="group" aria-label="Basic example">
                    {NewButton}
                </div>
                <div className="btn-group btn-group-sm pull-right" role="group" aria-label="Basic example">
                    {EditCancelButton}
                </div>
            </div>
        );
    }
});

module.exports = orwell(GenericDeckViewButtons, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor(['display', 'view']),
            localstate.cursor('editMode'),
            localstate.cursor('creatingNew'),
            localstate.cursor('newDeckName')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            view: localstate.cursor(['display', 'view']).deref(decks.view.subdecks),
            editMode: localstate.cursor('editMode').deref(false),
            creatingNew: localstate.cursor('creatingNew').deref(false),
            newDeckName: localstate.cursor('newDeckName').deref('')
        };
    }
});
