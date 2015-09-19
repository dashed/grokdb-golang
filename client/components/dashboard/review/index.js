const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const either = require('react-either');
const classNames = require('classnames');
const minitrue = require('minitrue');
const once = require('react-prop-once');
const {Probe} = require('minitrue');

const {NOT_SET, paths} = require('store/constants');

const ReviewMeta = require('./meta');
const ReviewEntries = require('./entries');

const ReviewDashboard = React.createClass({

    propTypes: {
        title: React.PropTypes.string.isRequired,
        front: React.PropTypes.string.isRequired,
        back: React.PropTypes.string.isRequired,
        showMeta: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onClickEntries(event){
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.cursor('showMeta').update(function() {
            return false;
        });
    },

    onClickMeta(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.cursor('showMeta').update(function() {
            return true;
        });
    },

    render() {

        const {front, back, title, showMeta} = this.props;

        const handler = (function() {
            if(showMeta) {
                return (
                    <ReviewMeta key="meta" />
                );
            }

            return (<ReviewEntries key="entries" localstate={this.props.localstate} front={front} back={back} title={title} />);
        }.call(this));

        return (
            <div>
                <div className="row m-b">
                    <div className="col-sm-12">
                            <div className="btn-group pull-left" role="group" aria-label="Basic example">
                                <button
                                    type="button"
                                    className={classNames(
                                        'btn',
                                        'btn-sm',
                                        {
                                            'btn-secondary': showMeta,
                                            'btn-primary': !showMeta
                                        }
                                    )}
                                    onClick={this.onClickEntries}>{"Entries"}</button>
                                <button
                                    type="button"
                                    className={classNames(
                                        'btn',
                                        'btn-sm',
                                        {
                                            'btn-secondary': !showMeta,
                                            'btn-primary': showMeta
                                        }
                                    )}
                                    onClick={this.onClickMeta}>{"Meta"}</button>
                            </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {handler}
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

const OrwellWrappedReviewDashboard = orwell(ReviewDashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();
        const {localstate} = props;

        return [
            state.cursor(paths.review.self),
            localstate.cursor('showMeta')
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();
        const {localstate} = props;

        const reviewCard = state.cursor(paths.review.self).deref(NOT_SET);

        if(!Immutable.Map.isMap(reviewCard)) {
            return {
                reviewCard
            };
        }

        const jsonMarshalled = JSON.parse(reviewCard.get('sides'));
        const {front = void 0} = jsonMarshalled;
        const {back = void 0} = jsonMarshalled;

        return {
            reviewCard,
            title: reviewCard.get('title'),
            description: reviewCard.get('description'),
            front,
            back,

            showMeta: localstate.cursor('showMeta').deref(false)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

module.exports = once(OrwellWrappedReviewDashboard, function assignPropsOnMount() {
    return {
        localstate: minitrue({
            showDescription: false,
            showBackSide: false,
            showMeta: false,
            revealCard: false
        })
    };
}, function cleanOnUnmount(cachedProps) {
    cachedProps.localstate.removeListeners('any');
});
