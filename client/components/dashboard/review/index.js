const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const either = require('react-either');

const Preview = require('components/markdownpreview');

const {NOT_SET, paths} = require('store/constants');

const ReviewDashboard = React.createClass({

    propTypes: {
        reviewCard: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        front: React.PropTypes.string.isRequired,
        back: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            showDescription: false
        };
    },

    onClickShowDescription(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            showDescription: !this.state.showDescription
        });
    },

    render() {

        const {reviewCard, front} = this.props;
        console.log(reviewCard + '');

        const title = reviewCard.get('title');
        const description = reviewCard.get('description');

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-block">
                                <h4 className="card-title m-y-0">{title}</h4>
                                <hr/>
                                <Preview text={front} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <button type="button" className="btn btn-primary btn-lg btn-block">{"Show the back side"}</button>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <div className="card m-t">
                            <div className="card-block">
                                <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                                    <button type="button" className="btn btn-secondary" onClick={this.onClickShowDescription}>
                                        {`${this.state.showDescription ? 'Hide' : 'Show'} Description`}
                                    </button>
                                </div>
                                <hr/>
                                {(function() {

                                    if(!this.state.showDescription) {
                                        return null;
                                    }

                                    return (<Preview text={description} />);
                                }.call(this))}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

const NoReviewCard = React.createClass({
    render() {
        return (
            <div>no card</div>
        );
    }
});

const ReviewDashboardOcclusion = either(ReviewDashboard, NoReviewCard, function(props) {

    const {reviewCard} = props;

    if(reviewCard === NOT_SET || !Immutable.Map.isMap(reviewCard)) {
        return false;
    }

    return true;
});

module.exports = orwell(ReviewDashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.review.self)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        const reviewCard = state.cursor(paths.review.self).deref(NOT_SET);
        const jsonMarshalled = Immutable.Map.isMap(reviewCard) ? JSON.parse(reviewCard.get('sides')) : {};
        const {front = void 0} = jsonMarshalled;
        const {back = void 0} = jsonMarshalled;

        return {
            reviewCard,
            front,
            back
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

