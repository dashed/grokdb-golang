const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const DeleteCard = React.createClass({

    propTypes: {
        onClickDelete: React.PropTypes.func.isRequired
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

        const {onClickDelete} = this.props;
        onClickDelete.call(void 0);
    },

    render() {

        const deleteComponent = (function() {

            if(this.state.confirmDelete) {
                return (
                    <div>
                        <strong>{"Are you sure you want to delete this card?"}</strong>
                        {" "}
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button type="button" className="btn btn-danger" onClick={this.reallyDelete}>Yes</button>
                            <button type="button" className="btn btn-secondary" onClick={this.cancelDelete}>No</button>
                        </div>
                    </div>
                );
            }

            return (
                <button type="button" className="btn btn-danger btn-sm" onClick={this.willDeleteClick}>{"Delete this card"}</button>
            );

        }.call(this));

        return (
            <div className="card-block">
                <strong className="text-muted">{"Delete this card"}</strong>
                <p className="card-text">
                    {"Once you delete a card, there is no going back."}
                </p>
                <p className="card-text">
                    {deleteComponent}
                </p>
            </div>
        );
    }
});

const DeleteCardOcclusion = either(DeleteCard, null, function(props) {
    return props.showDelete;
});

module.exports = orwell(DeleteCardOcclusion, {
    assignNewProps(props, context) {

        const {localstate} = props;

        return {
            showDelete: localstate.cursor('showDelete').deref(false),
            store: context.store,
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
