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

        stashes: React.PropTypes.instanceOf(Immutable.List).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {

        const {stashes} = this.props;

        return (
            <div key="stashes">
                <div className="card-block">
                    <ListFilter
                        list={stashes}
                        labelForItem={labelForItem}
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
            localstate.cursor('stashes')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            stashes: localstate.cursor('stashes').deref(Immutable.List())
        };
    }
});
