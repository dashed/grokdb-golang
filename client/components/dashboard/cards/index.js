const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths} = require('store/constants');
const {toDeckCards, toDeckCardsNew} = require('store/route');

const CardsList = require('./list');
const CreatingCard = require('./new');
const CardsPagination = require('./pagination');
const CardProfile = require('./profile');

const CardsDashboard = React.createClass({

    propTypes: {
        viewingProfile: React.PropTypes.bool.isRequired,
        creatingNew: React.PropTypes.bool.isRequired,
        store: React.PropTypes.object.isRequired
    },

    onClickBack(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.dispatch(toDeckCards);
    },

    onClickNewCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;

        store.dispatch(toDeckCardsNew);
    },

    onClickEditCard(event) {
        event.preventDefault();
        event.stopPropagation();

        console.log('edit card');
    },

    render() {

        const {creatingNew, viewingProfile} = this.props;

        if(viewingProfile) {
            return (
                <div key="viewingProfile">
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <div className="btn-group pull-left" role="group" aria-label="Basic example">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={this.onClickBack}>{"Back to list"}</button>
                            </div>
                            <div className="btn-group pull-right" role="group" aria-label="Basic example">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={this.onClickEditCard}>{"Edit Card"}</button>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <CardProfile />
                        </div>
                    </div>
                </div>
            );
        }

        if(creatingNew) {
            return (
                <div key="creatingNew">
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
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
            <div key="cardlist">
                <div className="row">
                    <div className="col-sm-12">
                        <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={this.onClickNewCard}>{"New Card"}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsPagination />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsList />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsPagination />
                    </div>
                </div>
            </div>
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
            state.cursor(paths.dashboard.cards.creatingNew),
            state.cursor(paths.dashboard.cards.viewingProfile)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            deck: state.cursor(paths.deck.self).deref(),
            creatingNew: state.cursor(paths.dashboard.cards.creatingNew).deref(),
            viewingProfile: state.cursor(paths.dashboard.cards.viewingProfile).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
