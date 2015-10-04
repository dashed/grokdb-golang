const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');

const {stash} = require('store/constants');
const GenericCardViewButtons = require('./viewbuttons');
const GenericStashDescription = require('./description');
const GenericStashCards = require('./cards');
const GenericStashMeta = require('./meta');

const GenericStashProfile = React.createClass({

    propTypes: {
        onSwitchView: React.PropTypes.func.isRequired,
        onCommit: React.PropTypes.func.isRequired,
        onClickEdit: React.PropTypes.func.isRequired,
        onClickCancelEdit: React.PropTypes.func.isRequired,
        onClickDelete: React.PropTypes.func.isRequired,

        // localstate
        view: React.PropTypes.string.isRequired,
        stashID: React.PropTypes.number.isRequired,
        name: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired,
        commitLabel: React.PropTypes.string.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onChangeName(event) {

        const {localstate} = this.props;

        localstate.cursor(['stash', 'name']).update(function() {
            return event.target.value;
        });
    },

    onCommit(event) {

        event.preventDefault();
        event.stopPropagation();

        const {onCommit, localstate} = this.props;

        const stashCommit = {
            name: localstate.cursor(['stash', 'name']).deref(''),
            description: localstate.cursor(['stash', 'description']).deref('')
        };

        onCommit.call(void 0, stashCommit);
    },

    render() {

        const {editMode, localstate, onSwitchView, view, onClickEdit, onClickCancelEdit} = this.props;

        const ViewComponent = (function() {

            if(view === stash.view.description) {
                return (
                    <GenericStashDescription key="description"
                        localstate={localstate}
                    />
                );
            }

            if(view === stash.view.meta) {
                return (
                    <GenericStashMeta key="meta"
                        localstate={localstate}
                    />
                );
            }

            return (
                <div key="empty" className="card-block p-y-0 p-b">
                </div>
            );
        }.call(this));

        const CardsList = (function() {

            if(view === stash.view.cards) {

                return (
                    <GenericStashCards
                        key="cards"
                        localstate={localstate}
                    />
                );
            }

            return null;

        }.call(this));

        const CommitButton = (function() {

            if(!editMode || view === stash.view.cards) {
                return null;
            }

            const {commitLabel} = this.props;

            return (
                <div className="card-block p-t-0">
                    <div className="btn-group" role="group" aria-label="Basic example">
                        <button type="button" className="btn btn-success" onClick={this.onCommit}>{commitLabel}</button>
                    </div>
                </div>
            );
        }.call(this));

        return (
            <div>
                <div className="card">
                    <div className="card-block">
                        {(function() {

                            const {name, stashID} = this.props;

                            if(editMode) {
                                return (
                                    <fieldset className="form-group m-y-0">
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="stashTitle"
                                            placeholder={`Name for stash #${stashID}`}
                                            value={name}
                                            onChange={this.onChangeName}
                                        />
                                    </fieldset>
                                );
                            }

                            return (
                                <h4 className="card-title m-y-0">
                                    <span className="text-muted lead">{`#${stashID}`}</span>
                                    {` `}
                                    {name}
                                </h4>
                            );

                        }.call(this))}
                    </div>
                    <hr className="m-y-0" />
                    <GenericCardViewButtons
                        onClickCancelEdit={onClickCancelEdit}
                        onClickEdit={onClickEdit}
                        onSwitchView={onSwitchView}
                        localstate={localstate}
                    />
                    {ViewComponent}
                    {CommitButton}
                </div>
                {CardsList}
            </div>
        );
    }
});

module.exports = orwell(GenericStashProfile, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('editMode'),
            localstate.cursor(['stash', 'name']),
            localstate.cursor(['display', 'view']),
            localstate.cursor('commitLabel')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            stashID: localstate.cursor(['stash', 'id']).deref(0),
            name: localstate.cursor(['stash', 'name']).deref(''),
            editMode: localstate.cursor('editMode').deref(false),
            view: localstate.cursor(['display', 'view']).deref(stash.view.cards),
            commitLabel: localstate.cursor('commitLabel').deref('Save Stash')
        };
    }
});
