const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');

const CardsList = require('./list');
const CreatingCard = require('./new');

const CardsDashboard = React.createClass({
    render() {

        const {creatingNew} = this.props;

        if(creatingNew) {
            return (
                <CreatingCard />
            );
        }

        return (
            <CardsList />
        );
    }
});

// don't show until all data dependencies are satisfied
const CardsDashboardOcclusion = either(CardsDashboard, null, function(props) {

    if(NOT_SET === props.deck) {
        return false;
    }

    return true;
});


module.exports = orwell(CardsDashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.deck.self),
            state.cursor(paths.dashboard.cards.creatingNew)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            deck: state.cursor(paths.deck.self).deref(),
            creatingNew: state.cursor(paths.dashboard.cards.creatingNew).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
