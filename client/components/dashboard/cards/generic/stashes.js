const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const Immutable = require('immutable');

const ListFilter = require('components/listfilter');

const labelForItem = function(value) {
    return value.get('name');
};

const GenericCardStashes = React.createClass({

    propTypes: {
        onClickDeleteStash: React.PropTypes.func.isRequired,
        onClickAddStash: React.PropTypes.func.isRequired,

        currentStashes: React.PropTypes.instanceOf(Immutable.List).isRequired, // stashes current card is in
        stashes: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    isItemActive(stash) {
        const {currentStashes} = this.props;
        return (currentStashes.indexOf(stash.get('id', 0)) >= 0);
    },

    onClickStash(stash) {

        const {onClickDeleteStash, onClickAddStash} = this.props;

        if (this.isItemActive(stash)) {
            // remove stash
            onClickDeleteStash(stash);
            return;
        }

        // add stash
        onClickAddStash(stash);
    },

    render() {

        const {stashes} = this.props;

        return (
            <div key="stashes">
                <div className="card-block">
                    <ListFilter
                        list={stashes}
                        labelForItem={labelForItem}
                        onClickItem={this.onClickStash}
                        isItemActive={this.isItemActive}
                    />
                </div>
            </div>
        );
    }
});

module.exports = orwell(GenericCardStashes, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor(['card', 'stashes']),
            localstate.cursor('stashes')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            currentStashes: localstate.cursor(['card', 'stashes']).deref(Immutable.List()),
            stashes: localstate.cursor('stashes').deref(Immutable.List())
        };
    }
});
