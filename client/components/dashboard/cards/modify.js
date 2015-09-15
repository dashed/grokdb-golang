const React = require('react');
const _ = require('lodash');

const NewSides = require('./newsides');
const NewDescription = require('./newdescription');

const CardModify = React.createClass({

    propTypes: {
        onCommit: React.PropTypes.func.isRequired,
        commitLabel: React.PropTypes.string.isRequired
    },

    getInitialState() {

        return {
            title: '',
            sides: {
                front: '',
                back: ''
            },
            description: ''
        };
    },

    onChangeTitle(event) {
        this.setState({
            title: event.target.value
        });
    },

    onClickCommit(event) {
        event.preventDefault();
        event.stopPropagation();

        // TODO: form error handling
        if(this.state.title.trim().length <= 0) {
            return;
        }

        this.props.onCommit(this.state);
    },

    onChangeDescription(description) {
        this.setState({
            description: description
        });
    },

    onChangeSides(newSide) {
        this.setState({
            sides: _.assign(this.state.sides, newSide)
        });
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        {/*warning*/}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-header">
                                <strong>{"Card Title"}</strong>
                            </div>
                            <div className="card-block">
                                <fieldset className="form-group m-y-0">
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="cardTitle"
                                        placeholder="Card Title"
                                        value={this.state.title}
                                        onChange={this.onChangeTitle}
                                    />
                                </fieldset>
                            </div>

                            <div className="card-header p-y-0">
                                {""}
                            </div>
                            <div className="card-header">
                                <strong>{"Sides"}</strong>
                            </div>

                            <NewSides
                                onChange={this.onChangeSides}
                                sides={this.state.sides}
                            />

                            <div className="card-header p-y-0">
                                {""}
                            </div>
                            <div className="card-header">
                                <strong>{"Card Description"}</strong>
                            </div>

                            <NewDescription
                                onChange={this.onChangeDescription}
                                description={this.state.description}
                            />

                            <div className="card-block p-t-0">
                                <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                                    <button type="button" className="btn btn-success" onClick={this.onClickCommit}>{this.props.commitLabel}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = CardModify;
