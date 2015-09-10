const React = require('react');
const orwell = require('orwell');

const Component = React.createClass({
    render() {
        return (<div>decks</div>);
    }
});

module.exports = orwell(Component, {
    watchCursors(props) {
        return [];
    },
    assignNewProps(props) {
        return {
            deck: null
        };
    }
});

