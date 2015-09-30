const React = require('react');
const orwell = require('orwell');
const classNames = require('classnames');
const TextareaAutosize = require('react-textarea-autosize');
const {Probe} = require('minitrue');
const _ = require('lodash');

const {tabSize, cards} = require('store/constants');
const Preview = require('components/markdownpreview');

const transformView = function(view) {
    switch(view) {
    case cards.view.front:
        return 'front';
    case cards.view.back:
        return 'back';
    case cards.view.description:
        return 'description';
    }

    throw Error('invariant violation');
};

const GenericCardInputDisplay = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        view: React.PropTypes.string.isRequired,
        mode: React.PropTypes.string.isRequired,
        source: React.PropTypes.string.isRequired,
        editMode: React.PropTypes.bool.isRequired
    },

    onSwitchMode(mode) {

        const {localstate} = this.props;

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {view} = this.props;

            localstate.cursor(['display', 'mode', view]).update(function() {
                return mode;
            });
        };
    },

    onChange(event) {

        const {localstate, view} = this.props;

        const {editMode} = this.props;

        if(!editMode) {
            return;
        }

        localstate.cursor(['card', transformView(view)]).update(function() {
            return event.target.value;
        });
    },

    render() {

        const {mode, source, view, editMode} = this.props;

        const Visual = (function() {
            if(mode === cards.display.render) {
                return (
                    <div>
                        <Preview key="preview" text={source} />
                        { editMode ? <hr className="m-b-0"/> : null}
                    </div>
                );
            }

            const placeholder = !editMode ? '' :
                view === cards.view.front ? 'Front entry' :
                view === cards.view.back ? 'Back entry' : 'Description';

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
                mode: cards.display.source,
                label: 'Write'
            });

            arry.push({
                mode: cards.display.render,
                label: 'Preview'
            });
        } else {
            arry.push({
                mode: cards.display.render,
                label: 'Render'
            });

            arry.push({
                mode: cards.display.source,
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
            <div className="card-block">
                    <ul style={tabSize} className="nav nav-tabs m-b">
                        {Tabs}
                    </ul>
                    {Visual}
            </div>
        );
    }
});

const GenericCardInputDisplayOrwell = orwell(GenericCardInputDisplay, {
    watchCursors(props) {
        const {localstate, view} = props;

        return [
            localstate.cursor(['display', 'mode', view]),
            localstate.cursor(['card', transformView(view)]),
            localstate.cursor('editMode'),
            localstate.cursor('defaultMode')
        ];
    },
    shouldRewatchCursors(props) {
        const {view} = props;

        if(view != this.currentProps.view) {
            return true;
        }
    },
    assignNewProps(props) {

        const {localstate, view} = props;

        const editMode = localstate.cursor('editMode').deref(false);

        const defaultMode = localstate.cursor('defaultMode').deref(cards.display.render);

        return {
            view: view,
            mode: localstate.cursor(['display', 'mode', view]).deref(defaultMode),
            source: localstate.cursor(['card', transformView(view)]).deref(''),
            editMode: editMode
        };
    }
});

module.exports = orwell(GenericCardInputDisplayOrwell, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor(['display', 'view'])
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;

        const view = localstate.cursor(['display', 'view']).deref(cards.view.front);

        return {
            view: view
        };
    }
});



