const React = require('react');
const {Probe} = require('minitrue');
const Immutable = require('immutable');
const orwell = require('orwell');

const GenericDeckTitle = require('./title');
const GenericDeckViewButtons = require('./viewbuttons');
const GenericDeckSubDecks = require('./subdecks');
const GenericDeckDescription = require('./description');

const {decks} = require('store/constants');

const noop = x => x;
const nilop = () => void 0;

// structure of localstate
const DEFAULTS = {
    deck: {
        // all strings
        name: '',
        description: ''
    },

    children: Immutable.List(),

    creatingNew: false,
    newDeckName: '',
    // showEditButton: false,
    editMode: false,
    // showDelete: false,

    // defaultMode: cards.display.render, // render or source
    // hideMeta: false, // bool
    commitLabel: 'Save', // string
    display: {
        view: decks.view.subdecks, // string
        mode: {
            // decks.view.description, etc
        }
    }
};
const overrides = Immutable.fromJS(DEFAULTS);

const GenericDeck = React.createClass({

    propTypes: {
        // static
        onSwitchView: React.PropTypes.func,
        onClickEdit: React.PropTypes.func,
        onClickCancelEdit: React.PropTypes.func,
        onClickDeck: React.PropTypes.func,
        onAddNewDeck: React.PropTypes.func,
        onCommit: React.PropTypes.func.isRequired,

        // onClickDelete: React.PropTypes.func.isRequired,

        // localstate
        view: React.PropTypes.string.isRequired,
        name: React.PropTypes.string.isRequired,
        // commitLabel: React.PropTypes.string.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    getDefaultProps() {
        return {
            onSwitchView: noop,
            onClickEdit: nilop,
            onClickCancelEdit: nilop,
            onClickDeck: nilop,
            onAddNewDeck: nilop,
            onCommit: nilop
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
            onClickEdit,
            onClickCancelEdit,
            onAddNewDeck,
            onCommit,
            view
        } = this.props;

        const ViewComponent = (function() {

            if(view === decks.view.subdecks) {

                const {onClickDeck} = this.props;

                return (
                    <GenericDeckSubDecks
                        key="subdecks"
                        onClickDeck={onClickDeck}
                        localstate={localstate}
                    />
                );
            }

            return (
                <GenericDeckDescription key="description"
                    onCommit={onCommit}
                    localstate={localstate}
                />
            );
        }.call(this));


        return (
            <div className="row">
                <div className="col-sm-12">
                    <div className="card">
                        <div className="card-block">
                            <GenericDeckTitle localstate={localstate} />
                        </div>
                        <hr className="m-y-0" />
                        <GenericDeckViewButtons
                            onClickCancelEdit={onClickCancelEdit}
                            onClickEdit={onClickEdit}
                            onAddNewDeck={onAddNewDeck}
                            onSwitchView={onSwitchView}
                            localstate={localstate}
                        />
                        {ViewComponent}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(GenericDeck, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor(['deck', 'name']),
            localstate.cursor(['display', 'view']),
            // localstate.cursor('commitLabel')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            name: localstate.cursor(['deck', 'name']).deref(''),
            view: localstate.cursor(['display', 'view']).deref(decks.view.subdecks),
            // commitLabel: localstate.cursor('commitLabel').deref('Save')
        };
    }
});
