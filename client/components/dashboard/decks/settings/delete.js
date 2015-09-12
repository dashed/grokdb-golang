const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {paths} = require('store/constants');

const DeleteDeck = React.createClass({

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

    render() {

        const deleteComponent = (function() {

            if(this.state.confirmDelete) {
                return (
                    <div className="pull-right">
                        <strong>{"Are you sure you want to delete this deck?"}</strong>
                        {" "}
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button type="button" className="btn btn-danger">Yes</button>
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
                <strong>{"Delete this deck"}</strong>
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
    watchCursors() {

        // const state = context.store.state();

        // return [
        //     state.cursor(paths.editingDeck)
        // ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        const rootID = state.cursor(paths.root).deref();
        const currentDeckID = state.cursor(paths.currentDeck).deref().get('id');

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
