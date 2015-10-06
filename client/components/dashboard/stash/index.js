const React = require('react');
const orwell = require('orwell');

const {toStashNew, toStash} = require('store/route');
const {paths} = require('store/constants');

const StashesList = require('./list');
const StashProfile = require('./profile');
const CreatingStash = require('./new');

const StashDashboard = React.createClass({

    propTypes: {
        viewingProfile: React.PropTypes.bool.isRequired,
        creatingNew: React.PropTypes.bool.isRequired,
        store: React.PropTypes.object.isRequired,
    },

    onClickBack(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(toStash);
    },

    onClickNewStash(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(toStashNew);
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
                                    onClick={this.onClickBack}>{"Back to stashes"}</button>
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
                                onClick={this.onClickBack}>{"Back to stashes"}</button>
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
            state.cursor(paths.dashboard.stashes.viewingProfile)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            creatingNew: state.cursor(paths.dashboard.stashes.creatingNew).deref(),
            viewingProfile: state.cursor(paths.dashboard.stashes.viewingProfile).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
