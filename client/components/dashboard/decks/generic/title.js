const React = require('react');
const orwell = require('orwell');

const GenericDeckTitle = React.createClass({

    propTypes: {
        name: React.PropTypes.string.isRequired,
        // localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {
        return (
            <h4 className="card-title m-y-0">{this.props.name}</h4>
        );
    }
});

module.exports = orwell(GenericDeckTitle, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            // localstate.cursor('editMode'),
            localstate.cursor(['deck', 'name'])
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            name: localstate.cursor(['deck', 'name']).deref(''),
            // editMode: localstate.cursor('editMode').deref(false)
        };
    }
});
