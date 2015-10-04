const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const TextareaAutosize = require('react-textarea-autosize');
const _ = require('lodash');
const classNames = require('classnames');

const {stash, tabSize} = require('store/constants');
const Preview = require('components/markdownpreview');

const GenericStashDescription = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        mode: React.PropTypes.string.isRequired,
        source: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired
    },

    onSwitchMode(mode) {

        const {localstate} = this.props;

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            localstate.cursor(['display', 'mode', stash.view.description]).update(function() {
                return mode;
            });
        };
    },

    onChange(event) {

        const {editMode} = this.props;

        if(!editMode) {
            return;
        }

        const {localstate} = this.props;


        localstate.cursor(['stash', 'description']).update(function() {
            return event.target.value;
        });
    },

    render() {

        const {mode, source, editMode} = this.props;

        const Visual = (function() {
            if(mode === stash.display.render) {
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
                    id="stashDescription"
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
                mode: stash.display.source,
                label: 'Write'
            });

            arry.push({
                mode: stash.display.render,
                label: 'Preview'
            });
        } else {
            arry.push({
                mode: stash.display.render,
                label: 'Render'
            });

            arry.push({
                mode: stash.display.source,
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

        return (
            <div key="description" className="card-block">
                    <ul style={tabSize} className="nav nav-tabs m-b">
                        {Tabs}
                    </ul>
                    {Visual}
            </div>
        );
    }
});

module.exports = orwell(GenericStashDescription, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('editMode'),
            localstate.cursor(['display', 'mode', stash.view.description]),
            localstate.cursor(['stash', 'description']),
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            mode: localstate.cursor(['display', 'mode', stash.view.description]).deref(stash.display.render),
            source: localstate.cursor(['stash', 'description']).deref(''),
            editMode: localstate.cursor('editMode').deref(false),
        };
    }
});
