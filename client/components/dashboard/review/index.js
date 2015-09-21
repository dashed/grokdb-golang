const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const either = require('react-either');
const minitrue = require('minitrue');
const once = require('react-prop-once');
const {Probe} = require('minitrue');

const {NOT_SET, paths, cards} = require('store/constants');

const GenericCard = require('components/dashboard/cards/generic');
const ReviewControls = require('./controls');

const ReviewDashboard = React.createClass({

    propTypes: {
        reviewCard: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        revealCard: React.PropTypes.bool.isRequired
    },

    componentWillMount() {
        this.loadCard(this.props);
    },

    componentWillReceiveProps(nextProps) {
        const {revealCard, localstate} = nextProps;

        if(revealCard != this.props.revealCard) {
            localstate.cursor('hideBack').update(function() {
                return false;
            });
            localstate.cursor(['display', 'view']).update(function() {
                return cards.view.back;
            });
        }

        const oldreviewCard = this.props.reviewCard;
        const newreviewCard = nextProps.reviewCard;

        if(isNewReviewCard(oldreviewCard, newreviewCard)) {
            this.loadCard(nextProps);
        }
    },

    loadCard(props) {
        const {localstate, reviewCard: card} = props;

        localstate.cursor('card').update(Immutable.Map(), function(map) {

            const overrides = Immutable.fromJS({
                title: card.get('title'),
                description: card.get('description'),
                front: card.get('front'),
                back: card.get('back')
            });

            return map.mergeDeep(overrides);
        });
    },

    render() {

        const {localstate} = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <GenericCard
                            localstate={localstate}
                        />
                    </div>
                </div>
                <div className="row m-b">
                    <div className="col-sm-12">
                        <ReviewControls
                            localstate={localstate}
                        />
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
            localstate.cursor('revealCard')
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

        return {
            reviewCard,
            revealCard: localstate.cursor('revealCard').deref(false)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

// local state
module.exports = once(OrwellWrappedReviewDashboard, {
    contextTypes: {
        store: React.PropTypes.object.isRequired
    },
    assignPropsOnMount(props, context) {

        const {store} = context;

        const DEFAULTS = {
            showEditButton: false,
            editMode: false,
            hideMeta: false,
            hideBack: true,

            // review
            revealCard: false,
            difficulty: void 0
        };

        const localstate = minitrue(DEFAULTS);

        const _unsub = store.state().cursor(paths.review.self).observe(function(newReview, oldReview) {
            if(!Immutable.Map.isMap(newReview) || !Immutable.Map.isMap(oldReview)) {
                return;
            }

            if(!isNewReviewCard(newReview, oldReview)) {
                return;
            }

            // reload
            localstate.update(function() {
                return Immutable.fromJS(DEFAULTS);
            });

        });

        return {
            localstate: localstate,
            _unsub: _unsub
        };
    },

    cleanOnUnmount(cachedProps) {
        cachedProps.localstate.removeListeners('any');
        cachedProps._unsub.call(void 0);
    }
});

const isNewReviewCard = function(newReview, oldReview) {
    return (newReview.get('id') != oldReview.get('id') ||
        newReview.getIn(['review', 'updated_at']) != oldReview.getIn(['review', 'updated_at']));
};
