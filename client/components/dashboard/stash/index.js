const React = require('react');
const orwell = require('orwell');

const {flow} = require('store/utils');
const {toStashNew, toStash, toStashProfile} = require('store/route');
const {applyStashCardsPageArgs} = require('store/cards');
const {applyStashArgs} = require('store/stashes');
const {paths} = require('store/constants');

const StashesList = require('./list');
const StashProfile = require('./profile');
const CreatingStash = require('./new');
const StashReview = require('./review');

const StashDashboard = React.createClass({

    propTypes: {
        viewingProfile: React.PropTypes.bool.isRequired,
        creatingNew: React.PropTypes.bool.isRequired,
        reviewing: React.PropTypes.bool.isRequired,
        store: React.PropTypes.object.isRequired,
    },

    onClickBackToList(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(toStash);
    },

    onClickBackToStash(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(flow(applyStashArgs, applyStashCardsPageArgs, toStashProfile));
    },

    onClickNewStash(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(toStashNew);
    },

    render() {

        const {creatingNew, viewingProfile, reviewing} = this.props;

        if(reviewing) {
            return (
                <div key="viewingProfile">
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <div className="btn-group pull-left" role="group" aria-label="Basic example">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={this.onClickBackToStash}>{"Back to stash"}</button>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <StashReview />
                        </div>
                    </div>
                </div>
            );
        }

        if(viewingProfile) {

            return (
                <div key="viewingProfile">
                    <div className="row m-b">
                        <div className="col-sm-12">
                            <div className="btn-group pull-left" role="group" aria-label="Basic example">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={this.onClickBackToList}>{"Back to stashes"}</button>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <StashProfile />
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
                                onClick={this.onClickBackToList}>{"Back to stashes"}</button>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-sm-12">
                            <CreatingStash />
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
                            onClick={this.onClickNewStash}>{"New Stash"}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <StashesList />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(StashDashboard, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.stashes.creatingNew),
            state.cursor(paths.dashboard.stashes.viewingProfile),
            state.cursor(paths.dashboard.stashes.reviewing)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            creatingNew: state.cursor(paths.dashboard.stashes.creatingNew).deref(),
            viewingProfile: state.cursor(paths.dashboard.stashes.viewingProfile).deref(),
            reviewing: state.cursor(paths.dashboard.stashes.reviewing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
