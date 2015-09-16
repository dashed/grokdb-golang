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
                            <div className="card-block p-b-0">
                                <h4 className="card-title">{this.props.title}</h4>

                                <Preview text={this.props.description} />
                            </div>

                            <div className="card-header p-y-0">
                                {""}
                            </div>
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
