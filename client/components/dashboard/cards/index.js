const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');
const {toDeckCards} = require('store/route');

const CardsList = require('./list');
const CreatingCard = require('./new');

const CardsDashboard = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    onClickBack(event) {
        this.props.store.dispatch(toDeckCards);
    },

    render() {

        const {creatingNew} = this.props;

        if(creatingNew) {
            return (
                <div>
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={this.onClickBack}>{"Back to list"}</button>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <CreatingCard />
                        </div>
                    </div>
                </div>
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
            store: context.store,
            deck: state.cursor(paths.deck.self).deref(),
            creatingNew: state.cursor(paths.dashboard.cards.creatingNew).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
