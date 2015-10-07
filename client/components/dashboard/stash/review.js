const React = require('react');
const orwell = require('orwell');
const once = require('react-prop-once');
const either = require('react-either');
const Immutable = require('immutable');
const {Probe} = require('minitrue');
const minitrue = require('minitrue');

const {flow, stateless} = require('store/utils');
const {NOT_SET, paths, cards} = require('store/constants');
const {validateReviewInput, patchReview} = require('store/review');
const {applyStashArgs, applyStashReviewArgs, setStashReviewCard} = require('store/stashes');
const {fetchStashReviewCard} = require('store/stateless/stashes');

const GenericCard = require('components/dashboard/cards/generic');
const ReviewControls = require('components/dashboard/review/controls');

const finishReview = flow(

    applyStashArgs,
    // review
    applyStashReviewArgs,
    validateReviewInput,
    patchReview,
    stateless(fetchStashReviewCard),
    setStashReviewCard
);


const ReviewStashCard = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
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
            // don't hide card back side
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
            return map.mergeDeep(card);
        });
    },

    onNextCard(selectedDifficulty) {
        const {store} = this.props;
        store.invoke(finishReview, {
            skip: false,
            difficulty: selectedDifficulty
        });
    },

    onSkipCard() {
        const {store} = this.props;
        store.invoke(finishReview, {
            skip: true
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
                            onCommit={this.onNextCard}
                            onSkip={this.onSkipCard}

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
            <div className="card">
                <div className="card-block text-center">
                    <p className="card-text text-muted">
                        {"No cards to review in this stash. To get started, add a card to this stash."}
                    </p>
                </div>
            </div>
        );
    }
});

const ReviewStashCardOcclusion = either(ReviewStashCard, NoReviewCard, function(props) {

    const {reviewCard} = props;

    if(!Immutable.Map.isMap(reviewCard)) {
        return false;
    }

    return true;
});

const OrwellWrappedReviewStashCard = orwell(ReviewStashCardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();
        const {localstate} = props;

        return [
            state.cursor(paths.stash.review),
            localstate.cursor('revealCard')
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();
        const {localstate} = props;

        const reviewCard = state.cursor(paths.stash.review).deref(NOT_SET);

        if(!Immutable.Map.isMap(reviewCard)) {
            return {
                reviewCard
            };
        }

        return {
            store: context.store,
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
module.exports = once(OrwellWrappedReviewStashCard, {
    contextTypes: {
        store: React.PropTypes.object.isRequired
    },
    assignPropsOnMount(props, context) {

        const {store} = context;

        const DEFAULTS = {
            // props for card
            showEditButton: false,
            editMode: false,
            hideMeta: false,
            hideBack: true,

            // shared localstate with review
            revealCard: false,
            showSkip: true,
            difficulty: void 0
        };

        const localstate = minitrue(DEFAULTS);

        // watch for change in review card
        const _unsub = store.state().cursor(paths.stash.review).observe(function(newReview, oldReview) {
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
        cachedProps._unsub.call(void 0);
        cachedProps.localstate.removeListeners('any');
    }
});

const isNewReviewCard = function(newReview, oldReview) {
    return (newReview.get('id') != oldReview.get('id') ||
        newReview.getIn(['review', 'updated_at']) != oldReview.getIn(['review', 'updated_at']));
};
