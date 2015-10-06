const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const classNames = require('classnames');
const _ = require('lodash');

const {stash} = require('store/constants');

const GenericStashViewButtons = React.createClass({

    propTypes: {
        onClickEdit: React.PropTypes.func.isRequired,
        onClickCancelEdit: React.PropTypes.func.isRequired,
        onSwitchView: React.PropTypes.func.isRequired,
        view: React.PropTypes.string.isRequired,
        hideStashCards: React.PropTypes.bool.isRequired,
        hideMeta: React.PropTypes.bool.isRequired,
        showEditButton: React.PropTypes.bool.isRequired,
        editMode: React.PropTypes.bool.isRequired,
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

    render() {

        const {view} = this.props;

        const MetaButton = (function() {

            const {hideMeta} = this.props;

            if(hideMeta) {
                return null;
            }

            return (
                <div className="btn-group btn-group-sm m-r" role="group" aria-label="Basic example">
                    <button
                        type="button"
                        className={classNames('btn', {
                            'btn-primary': view === stash.view.meta,
                            'btn-secondary': view != stash.view.meta
                        })}
                        onClick={this.onSwitchView(stash.view.meta)}
                    >{"Meta"}</button>
                </div>
            );
        }.call(this));

        const EditCancelButton = (function() {

            const {showEditButton, editMode} = this.props;

            if(!showEditButton) {
                return null;
            }

            return (
                <div className="btn-group btn-group-sm pull-right" role="group" aria-label="Basic example">
                    <button
                        type="button"
                        className={classNames('btn', {
                            'btn-success': !editMode,
                            'btn-danger': editMode
                        })}
                        onClick={this.onClickEditCancel}
                    >{editMode ? 'Cancel' : 'Edit'}</button>
                </div>
            );
        }.call(this));

        const {hideStashCards} = this.props;

        const Sides = _.reduce([
            {
                hide: hideStashCards,
                view: stash.view.cards,
                label: 'Cards'
            },
            {
                hide: false,
                view: stash.view.description,
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


        return (
            <div className="card-block p-b-0">
                <div className="btn-group btn-group-sm m-r" role="group" aria-label="Basic example">
                    {Sides}
                </div>
                {MetaButton}
                {EditCancelButton}
            </div>
        );
    }
});

module.exports = orwell(GenericStashViewButtons, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor(['display', 'view']),
            localstate.cursor('hideMeta'),
            localstate.cursor('showEditButton'),
            localstate.cursor('editMode'),
            localstate.cursor('hideBack'),
            localstate.cursor('hideStashCards')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            showEditButton: localstate.cursor('showEditButton').deref(false),
            view: localstate.cursor(['display', 'view']).deref(stash.view.cards),
            hideMeta: localstate.cursor('hideMeta').deref(false),
            hideStashCards: localstate.cursor('hideStashCards').deref(false),
            editMode: localstate.cursor('editMode').deref(false),
            hideBack: localstate.cursor('hideBack').deref(false)
        };
    }
});

