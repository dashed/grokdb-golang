const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');
const either = require('react-either');

const {paths} = require('store/constants');

const DeckChild = require('./child');

const DeckChildren = React.createClass({

    propTypes: {
        currentChildrenCursor: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {

        const {currentChildrenCursor} = this.props;

        const currentChildrenRendered = currentChildrenCursor.reduce(function(accumulator, childCursor, indexKey) {
            accumulator.push(
                <li className="list-group-item" key={indexKey}>
                    <DeckChild childCursor={childCursor} />
                </li>
            );

            return accumulator;
        }, []);

        return (
            <ul className="list-group list-group-flush">
                {currentChildrenRendered}
            </ul>
        );

    }
});

const DeckChildrenOcclusion = either(DeckChildren, null, function(props) {
    return !props.editingDeck;
});

module.exports = orwell(DeckChildrenOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.deck.children),
            state.cursor(paths.dashboard.decks.editing)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref(),
            currentChildrenCursor: state.cursor(paths.deck.children)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
