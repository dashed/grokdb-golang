const React = require('react');
const Immutable = require('immutable');
const moment = require('moment');

const Preview = require('components/markdownpreview');
const Sides = require('./sides');

const timeFormat = `ddd, MMM Do YYYY, h:mm:ss a ZZ`;

const CardVisual = React.createClass({

    propTypes: {
        title: React.PropTypes.string.isRequired,
        sides: React.PropTypes.shape({
            front: React.PropTypes.string.isRequired,
            back: React.PropTypes.string.isRequired
        }),
        description: React.PropTypes.string.isRequired,
        review: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        createdAt: React.PropTypes.number.isRequired,
        updatedAt: React.PropTypes.number.isRequired
    },

    render() {

        const {review, createdAt, updatedAt} = this.props;

        const reviewedAt = review.get('updated_at');

        const success = review.get('success');
        const fails = review.get('fail');
        const total = success + fails;

        const offset = new Date().getTimezoneOffset();

        const __createdAt = moment.unix(createdAt).utcOffset(-offset);
        const __updatedAt = moment.unix(updatedAt).utcOffset(-offset);
        const __reviewedAt = moment.unix(reviewedAt).utcOffset(-offset);

        const createdAtString = __createdAt.format(timeFormat);
        const createdAtRel = __createdAt.fromNow();

        const updatedAtString = __updatedAt.format(timeFormat);
        const updatedAtRel = __updatedAt.fromNow();

        const reviewedAtString = __reviewedAt.format(timeFormat);
        const reviewedAtRel = __reviewedAt.fromNow();

        // difference in milliseconds
        const wasReviewed = Math.abs(__reviewedAt.diff(__createdAt)) <= 250 ? false : true;

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
                                <h4 className="card-title">{this.props.title}</h4>

                                <Preview text={this.props.description} />

                                <p className="card-text">
                                    <small className="text-muted">
                                        {'Last updated '}
                                        <abbr title={`Last updated on ${updatedAtString}`}>
                                            {updatedAtRel}
                                        </abbr>
                                    </small>
                                </p>
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
                                                <strong>{`Success: ${success}`}</strong>
                                            </p>
                                            <p className="card-text">
                                                <strong>{`Fails: ${fails}`}</strong>
                                            </p>
                                            <p className="card-text">
                                                <strong>{`Total: ${total}`}</strong>
                                            </p>
                                            <hr/>
                                            <p className="card-text">
                                                <strong>{`Score: ${review.get('score').toFixed(5)}`}</strong><br/>
                                                <small className="text-muted">{"Lower is better"}</small>
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
                                <div className="container">
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <center>
                                                {"Created "}
                                                <abbr title={`Created on ${createdAtString}`}>
                                                    {createdAtRel}
                                                </abbr>
                                            </center>
                                        </div>
                                        <div className="col-sm-6">
                                            <center>
                                                {
                                                    (function() {
                                                        if(!wasReviewed) {
                                                            return `Hasn't been reviewed yet`;
                                                        }

                                                        return (
                                                            <div>
                                                                {"Last reviewed"}
                                                                <abbr title={`Reviewed on ${reviewedAtString}`}>
                                                                    {reviewedAtRel}
                                                                </abbr>
                                                            </div>
                                                        );
                                                    }())
                                                }
                                            </center>
                                        </div>
                                    </div>
                                </div>
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
