const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {paths} = require('store/constants');
const {flow} = require('store/utils');
const {deleteDeck, applyDeckArgs, popFromBreadcrumb} = require('store/decks');
const {redirectToDeck} = require('store/route');

const invokeDeleteDeck = flow(
    // decks
    applyDeckArgs,
    deleteDeck,
    popFromBreadcrumb,

    // route
    redirectToDeck
);

const DeleteDeck = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState() {
        return {
            confirmDelete: false
        };
    },

    willDeleteClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            confirmDelete: true
        });
    },

    cancelDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            confirmDelete: false
        });
    },

    reallyDelete(event) {
        event.preventDefault();
        event.stopPropagation();

        const {store} = this.props;
        store.invoke(invokeDeleteDeck);
    },

    render() {

        const deleteComponent = (function() {

            if(this.state.confirmDelete) {
                return (
                    <div className="pull-right">
                        <strong>{"Are you sure you want to delete this deck?"}</strong>
                        {" "}
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button type="button" className="btn btn-danger" onClick={this.reallyDelete}>Yes</button>
                            <button type="button" className="btn btn-secondary" onClick={this.cancelDelete}>No</button>
                        </div>
                    </div>
                );
            }

            return (
                <button type="button" className="btn btn-danger btn-sm pull-right" onClick={this.willDeleteClick}>{"Delete this deck"}</button>
            );

        }.call(this));

        return (
            <div className="card-block">
                <strong className="text-muted">{"Delete this deck"}</strong>
                <p className="card-text">
                    {"Once you delete a deck, there is no going back."}
                    {deleteComponent}
                </p>
            </div>
        );
    }
});

const DeleteDeckOcclusion = either(DeleteDeck, null, function(props) {
    return !props.isRoot;
});

module.exports = orwell(DeleteDeckOcclusion, {
    assignNewProps(props, context) {

        const state = context.store.state();

        const rootID = state.cursor(paths.root).deref();
        const currentDeckID = state.cursor(paths.deck.self).deref().get('id');

        return {
            store: context.store,
            isRoot: rootID === currentDeckID
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
