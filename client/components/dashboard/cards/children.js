const {Probe} = require('minitrue');
const React = require('react');
const orwell = require('orwell');

const {paths} = require('store/constants');

const CardChild = require('./child');

const CardsChildren = React.createClass({

    propTypes: {
        listCursor: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {
        const {listCursor} = this.props;

        const currentChildrenRendered = listCursor.reduce(function(accumulator, childCursor) {
            accumulator.push(
                <li className="list-group-item" key={childCursor.deref().get('id')}>
                    <CardChild childCursor={childCursor} />
                </li>
            );

            return accumulator;
        }, []);


        return (
            <div className="card m-y-0">
                <div className="card-block">
                    {"card header here with some dropdowns"}
                </div>
                <ul className="list-group">
                    {currentChildrenRendered}
                </ul>
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

