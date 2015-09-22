const React = require('react');
const orwell = require('orwell');
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

    showEditButton: false,
    editMode: false,
    showDelete: false,

    defaultMode: cards.display.render, // render or source
    hideMeta: false, // bool
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
        onClickCommit: React.PropTypes.func,
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
            onClickCommit: nilop,
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
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <GenericCardProfile
                            onClickCancelEdit={onClickCancelEdit}
                            onClickEdit={onClickEdit}
                            onCommit={onCommit}
                            onSwitchView={onSwitchView}
                            onClickDelete={onClickDelete}
                            localstate={localstate}
                        />
                    </div>
                </div>
            </div>
        );
    }

});

module.exports = orwell(GenericCard, {
    // watchCursors(props) {
    //     const {localstate} = props;

    //     return [
    //         localstate.cursor('showControls'),
    //         localstate.cursor('controls')
    //     ];
    // },
    assignNewProps() {

        return {};
        // const {localstate} = props;

        // return {
        //     showControls: localstate.cursor('showControls').deref(true),
        //     currentControl: localstate.cursor('controls').deref(cards.controls.card)
        // };
    }
});
