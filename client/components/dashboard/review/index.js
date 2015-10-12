const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const either = require('react-either');
const minitrue = require('minitrue');
const once = require('react-prop-once');
const {Probe} = require('minitrue');

const {flow, stateless} = require('store/utils');
const {NOT_SET, paths, cards} = require('store/constants');
const {applyDeckArgs} = require('store/decks');
const {validateReviewInput, patchReview, nextReview, applyReviewArgs, setReviewCard} = require('store/review');
const {saveCard} = require('store/stateless/cards');
const {toDeckReview, toDeckReviewEdit, toStashProfile} = require('store/route');
const {setStashList, setStash} = require('store/stashes');
const {fetchStashList, addCardToStash, removeCardFromStash} = require('store/stateless/stashes');
const {applyStashCardsPageArgs} = require('store/cards');
const {fetchCard} = require('store/stateless/cards');

const GenericCard = require('components/dashboard/cards/generic');
const ReviewControls = require('./controls');

const saveCardState = flow(
    // cards
    stateless(saveCard),

    // route
    toDeckReview
);

const finishReview = flow(

    // decks
    applyDeckArgs,

    // review
    applyReviewArgs,
    validateReviewInput,
    patchReview,
    nextReview,

    // route
    toDeckReview
);

const toReviewEdit = flow(

    // decks
    applyDeckArgs,

    // route
    toDeckReviewEdit
);

const toReview = flow(

    // decks
    applyDeckArgs,

    // route
    toDeckReview
);

const __addCardToStash = flow(

    stateless(addCardToStash),
    stateless(fetchCard),
    function(state, options) {

        options.reviewCard = options.card;

        return options;
    },
    setReviewCard,

    stateless(fetchStashList),
    setStashList
);

const __removeCardFromStash = flow(

    stateless(removeCardFromStash),
    stateless(fetchCard),
    function(state, options) {

        options.reviewCard = options.card;

        return options;
    },
    setReviewCard,

    stateless(fetchStashList),
    setStashList
);

const changeToStash = flow(

    // stashes
    setStash,

    // route
    applyStashCardsPageArgs,
    toStashProfile
);

const ReviewDashboard = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isEditing: React.PropTypes.bool.isRequired,
        showControls: React.PropTypes.bool.isRequired,
        reviewCard: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        stashes: React.PropTypes.instanceOf(Immutable.List).isRequired,
        revealCard: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
    },

    componentWillMount() {
        this.loadCard(this.props, {});
        this.loadStashes(this.props, {});
        this.resolveEdit(this.props, {});
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

        this.loadCard(nextProps, this.props);
        this.loadStashes(nextProps, this.props);
        this.resolveEdit(nextProps, this.props);
    },

    loadStashes(nextProps, oldProps) {

        const {localstate, stashes: newStashes} = nextProps;
        const {stashes: oldStashes} = oldProps;

        if(newStashes === oldStashes) {
            return;
        }

        localstate.cursor('stashes').update(function() {
            return newStashes;
        });
    },

    resolveEdit(props, prevProps = {}) {
        const {localstate, isEditing} = props;
        localstate.cursor('editMode').update(function() {
            return isEditing;
        });

        localstate.cursor('defaultMode').update(function() {
            return isEditing ? cards.display.source : cards.display.render;
        });

        const {isEditing: previsEditing = false} = prevProps;

        localstate.cursor(['display', 'mode']).update(Immutable.Map(), function(val) {
            return previsEditing == isEditing ? val : Immutable.Map();
        });
    },

    loadCard(props, prevProps = {}) {
        const {localstate, reviewCard: newCard} = props;
        const {reviewCard: oldCard} = prevProps;

        if(oldCard == newCard) {
            return;
        }

        localstate.cursor('card').update(function() {
            return newCard;
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

    onClickEdit() {

        const {isEditing, store} = this.props;

        if(isEditing) {
            store.invoke(toReview);
            return;
        }

        store.invoke(toReviewEdit);
    },

    onClickCancelEdit() {

        const {store} = this.props;

        this.loadCard(this.props, this.props);
        store.invoke(toReview);
    },

    onClickSave(newCardRecord) {

        if(newCardRecord.title.length <= 0) {
            return;
        }

        const {store, reviewCard: card} = this.props;

        store.invoke(saveCardState, {
            patchCard: newCardRecord,
            card: card,
            cardID: card.get('id')
        });
    },

    onClickAddStash(stash) {

        const {store, reviewCard: card} = this.props;

        store.invoke(__addCardToStash, {
            card,
            cardID: card.get('id'),
            stash,
            stashID: stash.get('id')
        });
    },

    onClickDeleteStash(stash) {

        const {store, reviewCard: card} = this.props;

        store.invoke(__removeCardFromStash, {
            card,
            cardID: card.get('id'),
            stash,
            stashID: stash.get('id')
        });
    },

    onClickToStash(stash) {
        const {store} = this.props;
        store.invoke(changeToStash, {stash, stashID: stash.get('id')});
    },

    render() {

        const {localstate, showControls} = this.props;

        return (
            <div>
                <div key="card" className="row">
                    <div className="col-sm-12">
                        <GenericCard
                            onClickCancelEdit={this.onClickCancelEdit}
                            onClickEdit={this.onClickEdit}
                            onCommit={this.onClickSave}
                            onClickAddStash={this.onClickAddStash}
                            onClickDeleteStash={this.onClickDeleteStash}
                            onClickToStash={this.onClickToStash}
                            localstate={localstate}
                        />
                    </div>
                </div>
                {
                    (function() {

                        if(!showControls) {
                            return null;
                        }

                        return (
                            <div key="controls" className="row m-b">
                                <div className="col-sm-12">
                                    <ReviewControls
                                        onCommit={this.onNextCard}
                                        onSkip={this.onSkipCard}

                                        localstate={localstate}
                                    />
                                </div>
                            </div>
                        );
                    }.call(this))
                }
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
                        {"No cards to review. To get started, you should create your first card for this deck."}
                    </p>
                </div>
            </div>
        );
    }
});

const ReviewDashboardOcclusion = either(ReviewDashboard, NoReviewCard, function(props) {

    const {reviewCard} = props;

    if(!Immutable.Map.isMap(reviewCard)) {
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
            localstate.cursor('revealCard'),
            state.cursor(paths.card.editing),
            state.cursor(paths.dashboard.stashes.list)
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

        const isEditing = !!state.cursor(paths.card.editing).deref(false);

        return {
            store: context.store,
            reviewCard,
            revealCard: localstate.cursor('revealCard').deref(false),
            stashes: state.cursor(paths.dashboard.stashes.list).deref(Immutable.List()),
            isEditing: isEditing,
            showControls: !isEditing
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
            // props for card
            showEditButton: true,
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
        cachedProps._unsub.call(void 0);
        cachedProps.localstate.removeListeners('any');
    }
});

const isNewReviewCard = function(newReview, oldReview) {
    return (newReview.get('id') != oldReview.get('id') ||
        newReview.getIn(['review', 'updated_at']) != oldReview.getIn(['review', 'updated_at']));
};
