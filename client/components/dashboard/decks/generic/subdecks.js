const React = require('react');
const Immutable = require('immutable');
const orwell = require('orwell');

const GenericDeckSubDecks = React.createClass({

    propTypes: {
        children: React.PropTypes.instanceOf(Immutable.List).isRequired,
        onClickDeck: React.PropTypes.func.isRequired,
    },

    onClickDeck(deck) {

        const {onClickDeck} = this.props;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();

            onClickDeck.call(void 0, deck);
        };
    },

    render() {

        const {children} = this.props;

        const _onClickDeck = this.onClickDeck;

        const ChildrenRendered = children.reduce(function(accumulator, deck, index) {

            const key = deck.get('id');
            const cKey = `${key}-${index}-parent`;
            const cKey2 = `${key}-${index}-deck`;

            accumulator.push(
                <li className="list-group-item" key={cKey}>
                    <a href="#" onClick={_onClickDeck(deck)}>{deck.get('name')}</a>
                </li>
            );

            return accumulator;
        }, []);

        return (
            <ul className="list-group list-group-flush m-t">
                {ChildrenRendered}
            </ul>
        );
    }
});

module.exports = orwell(GenericDeckSubDecks, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('children')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            children: localstate.cursor('children').deref(Immutable.List())
        };
    }
});
