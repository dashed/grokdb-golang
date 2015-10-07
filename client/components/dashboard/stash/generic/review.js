const React = require('react');
const orwell = require('orwell');

const GenericStashReview = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },


    render() {
        return (
            <div>review</div>
        );
    }
});

module.exports = orwell(GenericStashReview, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            // localstate.cursor('editMode'),
            // localstate.cursor(['display', 'mode', stash.view.description]),
            // localstate.cursor(['stash', 'description']),
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            // mode: localstate.cursor(['display', 'mode', stash.view.description]).deref(stash.display.render),
            // source: localstate.cursor(['stash', 'description']).deref(''),
            // editMode: localstate.cursor('editMode').deref(false),
        };
    }
});
