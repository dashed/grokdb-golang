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
    },

    loadCard(props) {
        const {localstate, reviewCard: card} = props;

        localstate.cursor('card').update(Immutable.Map(), function(map) {

            const parsed = JSON.parse(card.get('sides'));

            const overrides = Immutable.fromJS({
                title: card.get('title'),
                description: card.get('description'),
                front: parsed.front,
                back: parsed.back
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
module.exports = once(OrwellWrappedReviewDashboard, function assignPropsOnMount() {

    const localstate = minitrue({
        showEditButton: false,
        editMode: false,
        hideMeta: false,
        hideBack: true,

        // review
        revealCard: false,
        difficulty: void 0
    });

    return {
        localstate: localstate
    };
}, function cleanOnUnmount(cachedProps) {
    cachedProps.localstate.removeListeners('any');
});
