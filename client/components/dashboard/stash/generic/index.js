const React = require('react');
const {Probe} = require('minitrue');
const Immutable = require('immutable');

const {stash} = require('store/constants');
const GenericStashProfile = require('./profile');

const noop = x => x;
const nilop = () => void 0;

// structure of localstate
const DEFAULTS = {
    stash: {
        // all strings
        name: '',
        description: ''
    },

    hideMeta: false,
    showEditButton: true,

    defaultMode: stash.display.render, // render or source
    commitLabel: 'Save Stash', // string
    display: {
        view: stash.view.cards, // string
        mode: {
            // stash.view.cards etc
        }
    }
};
const overrides = Immutable.fromJS(DEFAULTS);

const GenericStash = React.createClass({
    propTypes: {
        // static
        onSwitchView: React.PropTypes.func,
        onCommit: React.PropTypes.func,
        onClickEdit: React.PropTypes.func,
        onClickCancelEdit: React.PropTypes.func,
        onClickDelete: React.PropTypes.func,

        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    getDefaultProps() {
        return {
            onSwitchView: noop,
            onCommit: nilop,
            onClickEdit: nilop,
            onClickCancelEdit: nilop,
            onClickDelete: nilop
        };
    },

    componentWillMount() {

        const {localstate} = this.props;

        localstate.update(Immutable.Map(), function(map) {
            return overrides.mergeDeep(map);
        });
    },

    render() {

        const {
            localstate,
            onSwitchView,
            onCommit,
            onClickEdit,
            onClickCancelEdit,
            onClickDelete
        } = this.props;

        return (
            <div className="row">
                <div className="col-sm-12">
                    <GenericStashProfile
                        onClickCancelEdit={onClickCancelEdit}
                        onClickEdit={onClickEdit}
                        onCommit={onCommit}
                        onSwitchView={onSwitchView}
                        onClickDelete={onClickDelete}
                        localstate={localstate}
                    />
                </div>
            </div>
        );
    }
});

module.exports = GenericStash;
