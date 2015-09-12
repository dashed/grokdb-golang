const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const DeckChild = React.createClass({

    propTypes: {
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired
    },


    render() {

        const {deck} = this.props;

        return (
            <a href="#">{deck.get('name')}</a>
        );
    }
});

module.exports = orwell(DeckChild, {
    watchCursors(props) {

        return [
            props.childCursor
        ];
    },
    assignNewProps(props) {
        return {
            deck: props.childCursor.deref()
        };
    }
});
