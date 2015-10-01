const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');
const classNames = require('classnames');

const {decks, tabSize} = require('store/constants');
const Preview = require('components/markdownpreview');

const GenericDeckDescription = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        mode: React.PropTypes.string.isRequired,
        source: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired,
        commitLabel: React.PropTypes.string.isRequired,
        onCommit: React.PropTypes.func.isRequired
    },

    onSwitchMode(mode) {

        const {localstate} = this.props;

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            localstate.cursor(['display', 'mode', decks.view.description]).update(function() {
                return mode;
            });
        };
    },

    onCommit(event) {
        event.preventDefault();
        event.stopPropagation();

        const {onCommit, localstate} = this.props;

        const deck = {
            name: localstate.cursor(['deck', 'name']).deref(''),
            description: localstate.cursor(['deck', 'description']).deref('')
        };

        onCommit.call(void 0, deck);
    },

    onChange(event) {

        const {editMode} = this.props;

        if(!editMode) {
            return;
        }

        const {localstate} = this.props;


        localstate.cursor(['deck', 'description']).update(function() {
            return event.target.value;
        });
    },

    render() {

        const {mode, source, editMode} = this.props;

        const Visual = (function() {
            if(mode === decks.display.render) {
                return (
                    <div>
                        <Preview key="preview" text={source} />
                        { editMode ? <hr className="m-b-0"/> : null}
                    </div>
                );
            }

            const placeholder = !editMode ? '' : 'Description';

            return (
                <TextareaAutosize
                    key="textarea"
                    useCacheForDOMMeasurements
                    minRows={6}
                    maxRows={10}
                    className="form-control"
                    id="deckSide"
                    placeholder={placeholder}
                    onChange={this.onChange}
                    value={source}
                    readOnly={!editMode}
                />
            );
        }.call(this));

        let arry = [];

        if(editMode) {
            arry.push({
                mode: decks.display.source,
                label: 'Write'
            });

            arry.push({
                mode: decks.display.render,
                label: 'Preview'
            });
        } else {
            arry.push({
                mode: decks.display.render,
                label: 'Render'
            });

            arry.push({
                mode: decks.display.source,
                label: 'Source'
            });
        }

        const Tabs = _.map(arry, function(obj, idx) {
            return (
                <li key={`${idx}-${obj.mode}`} className="nav-item">
                    <a
                        href={'#'}
                        className={classNames('nav-link',
                            {active: mode === obj.mode}
                        )}
                        onClick={this.onSwitchMode(obj.mode)}
                    >{obj.label}</a>
                </li>
            );
        }, this);

        const CommitButton = (function() {

            if(!editMode /*|| view === cards.view.meta*/) {
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
                <div key="description" className="card-block">
                        <ul style={tabSize} className="nav nav-tabs m-b">
                            {Tabs}
                        </ul>
                        {Visual}
                </div>
                {CommitButton}
            </div>
        );
    }
});

module.exports = orwell(GenericDeckDescription, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('editMode'),
            localstate.cursor(['display', 'mode', decks.view.description]),
            localstate.cursor(['deck', 'description']),
            localstate.cursor('commitLabel')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            mode: localstate.cursor(['display', 'mode', decks.view.description]).deref(decks.display.render),
            source: localstate.cursor(['deck', 'description']).deref(''),
            editMode: localstate.cursor('editMode').deref(false),
            commitLabel: localstate.cursor('commitLabel').deref('Save')
        };
    }
});
