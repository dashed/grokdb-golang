const React = require('react');

const Preview = require('components/markdownpreview');
const Sides = require('./sides');

const CardVisual = React.createClass({

    propTypes: {
        title: React.PropTypes.string.isRequired,
        sides: React.PropTypes.shape({
            front: React.PropTypes.string.isRequired,
            back: React.PropTypes.string.isRequired
        }),
        description: React.PropTypes.string.isRequired
    },

    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        {/*things*/}
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-block">
                                <h4 className="card-title m-y-0">{this.props.title}</h4>

                                <Preview text={this.props.description} />

                                <p className="card-text"><small className="text-muted">Last updated 3 mins ago</small></p>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <strong>{"Stats"}</strong>
                            </div>
                            <div className="card-block">
                                <div className="container">
                                    <div className="row">
                                        <div className="col-sm-2">
                                            <p className="card-text">
                                                <strong>Success: 123</strong>
                                            </p>
                                            <p className="card-text">
                                                <strong>Fails: 123</strong>
                                            </p>
                                            <p className="card-text">
                                                <strong>Total: 123</strong>
                                            </p>
                                            <hr/>
                                            <p className="card-text">
                                                <strong>Score: 123</strong>
                                            </p>
                                        </div>
                                        <div className="col-sm-6">
                                          {"Graph here"}
                                        </div>
                                        <div className="col-sm-4">
                                          {"Histogram here"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer text-muted">
                                <center>{"Reviewed 2 days ago"}</center>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <strong>{"Sides"}</strong>
                            </div>

                            <Sides
                                sides={this.props.sides}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = CardVisual;
