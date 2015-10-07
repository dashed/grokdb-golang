const React = require('react');
const {Probe} = require('minitrue');
const Immutable = require('immutable');

const {cards} = require('store/constants');
const GenericCardProfile = require('./profile');

const noop = x => x;
const nilop = () => void 0;

// structure of localstate
const DEFAULTS = {
    card: {
        // all strings
        title: '',
        description: '',
        front : '',
        back: ''
    },

    stashes: Immutable.List(),

    showEditButton: false,
    editMode: false,
    showDelete: false,

    defaultMode: cards.display.render, // render or source
    hideMeta: false, // bool
    hideStashes: false, // bool
    commitLabel: 'Save', // string
    display: {
        view: cards.view.front, // string
        mode: {
            // cards.view.front etc
        }
    }
};
const overrides = Immutable.fromJS(DEFAULTS);

const GenericCard = React.createClass({

    propTypes: {
        // static
        onSwitchView: React.PropTypes.func,
        onCommit: React.PropTypes.func,
        onClickEdit: React.PropTypes.func,
        onClickCancelEdit: React.PropTypes.func,
        onClickDelete: React.PropTypes.func,
        onClickDeleteStash: React.PropTypes.func,
        onClickAddStash: React.PropTypes.func,
        onClickToStash:  React.PropTypes.func,

        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    getDefaultProps() {
        return {
            onSwitchView: noop,
            onCommit: nilop,
            onClickEdit: nilop,
            onClickCancelEdit: nilop,
            onClickDelete: nilop,
            onClickDeleteStash: nilop,
            onClickAddStash: nilop,
            onClickToStash: nilop
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
            onClickDelete,
            onClickDeleteStash,
            onClickAddStash,
            onClickToStash
        } = this.props;

        return (
            <div className="row">
                <div className="col-sm-12">
                    <GenericCardProfile
                        onClickCancelEdit={onClickCancelEdit}
                        onClickEdit={onClickEdit}
                        onCommit={onCommit}
                        onSwitchView={onSwitchView}
                        onClickDelete={onClickDelete}
                        onClickDeleteStash={onClickDeleteStash}
                        onClickAddStash={onClickAddStash}
                        onClickToStash={onClickToStash}
                        localstate={localstate}
                    />
                </div>
            </div>
        );
    }

});

module.exports = GenericCard;
