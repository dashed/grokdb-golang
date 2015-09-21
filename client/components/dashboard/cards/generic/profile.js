const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');

const {cards} = require('store/constants');
const GenericCardViewButtons = require('./viewbuttons');
const GenericCardInputDisplay = require('./inputdisplay');
const GenericCardMeta = require('./meta');

const GenericCardProfile = React.createClass({

    propTypes: {
        onSwitchView: React.PropTypes.func.isRequired,
        onCommit: React.PropTypes.func.isRequired,
        onClickEdit: React.PropTypes.func.isRequired,
        onClickCancelEdit: React.PropTypes.func.isRequired,

        // localstate
        view: React.PropTypes.string.isRequired,
        title: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired,
        commitLabel: React.PropTypes.string.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onChangeTitle(event) {

        const {localstate} = this.props;

        localstate.cursor(['card', 'title']).update(function() {
            return event.target.value;
        });
    },

    onCommit(event) {

        event.preventDefault();
        event.stopPropagation();

        const {onCommit, localstate} = this.props;

        const card = {
            title: localstate.cursor(['card', 'title']).deref(''),
            description: localstate.cursor(['card', 'description']).deref(''),
            front: localstate.cursor(['card', 'front']).deref(''),
            back: localstate.cursor(['card', 'back']).deref('')
        };

        onCommit.call(void 0, card);
    },

    render() {

        const {editMode, localstate, onSwitchView, view, onClickEdit, onClickCancelEdit} = this.props;

        const ViewComponent = (function() {

            if(view === cards.view.meta) {
                return (
                    <GenericCardMeta key="meta" localstate={localstate} />
                );
            }

            return (
                <GenericCardInputDisplay key="inputdisplay"
                    localstate={localstate}
                />
            );
        }());

        const CommitButton = (function() {

            if(!editMode || view === cards.view.meta) {
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
            <div className="card">
                <div className="card-block">
                    {(function() {

                        const {title} = this.props;

                        if(editMode) {
                            return (
                                <fieldset className="form-group m-y-0">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="cardTitle"
                                        placeholder="Title"
                                        value={title}
                                        onChange={this.onChangeTitle}
                                    />
                                </fieldset>
                            );
                        }

                        return (
                            <h4 className="card-title m-y-0">{title}</h4>
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
        );
    }
});

module.exports = orwell(GenericCardProfile, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('editMode'),
            localstate.cursor(['card', 'title']),
            localstate.cursor(['display', 'view'])
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            title: localstate.cursor(['card', 'title']).deref(''),
            editMode: localstate.cursor('editMode').deref(false),
            view: localstate.cursor(['display', 'view']).deref(cards.view.front),
            commitLabel: localstate.cursor('commitLabel').deref('Save')
        };
    }
});
