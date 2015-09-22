const {Probe} = require('minitrue');
const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {paths} = require('store/constants');

const CardChild = require('./child');

const CardsChildren = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        listCursor: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {
        const {listCursor, list} = this.props;

        const display = (function() {

            if(list.size <= 0) {
                return (
                    <div className="card-block text-center">
                        <p className="card-text text-muted">
                            {"No cards to display. To get started, you should create your first card for this deck."}
                        </p>
                    </div>
                );
            }

            // display list of cards

            const currentChildrenRendered = listCursor.reduce(function(accumulator, childCursor) {
                accumulator.push(
                    <li className="list-group-item" key={childCursor.deref().get('id')}>
                        <CardChild childCursor={childCursor} />
                    </li>
                );

                return accumulator;
            }, []);

            return (
                <div className="card-block p-a-0">
                    <ul className="list-group">
                        {currentChildrenRendered}
                    </ul>
                </div>
            );
        }());

        return (
            <div>
                {display}
            </div>
        );
    }
});

module.exports = orwell(CardsChildren, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.cards.list)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: store,
            listCursor: state.cursor(paths.dashboard.cards.list)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

