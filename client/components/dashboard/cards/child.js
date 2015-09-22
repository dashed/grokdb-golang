const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const moment = require('moment');

const {flow} = require('store/utils');
const {setCard} = require('store/cards');
const {toCardProfile} = require('store/route');


const changeToCard = flow(

    // cards
    setCard,

    // route
    toCardProfile
);

const CardChild = React.createClass({

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        store: React.PropTypes.object.isRequired
    },

    onClickCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {card, store} = this.props;
        store.invoke(changeToCard, {card, cardID: card.get('id')});
    },

    generateSummary() {

        const {card} = this.props;

        const timesReviewed = `Reviewed ${card.getIn(['review', 'times_reviewed'])} times.`;

        const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(card.getIn(['review', 'updated_at'])).utcOffset(-offset);;

        const createdAt = moment.unix(card.get('created_at')).utcOffset(-offset);
        const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `Last reviewed ${lastReviewedDatetime.fromNow()}.` : `Hasn't been reviewed.`;

        const score = `Score of ${card.getIn(['review', 'score']).toPrecision(5)}`;

        return `${timesReviewed} ${lastReviewed} ${score}`;
    },

    render() {

        const {card} = this.props;
        const title = card.get('title');

        return (
            <a href="#" className="list-group-item carditem" onClick={this.onClickCard}>
                <h4 className="list-group-item-heading">{title}</h4>
                <p className="list-group-item-text">
                    {this.generateSummary()}
                </p>
            </a>
        );
    }
});

module.exports = orwell(CardChild, {
    // TODO: needs this fix: https://github.com/Dashed/orwell/issues/14
    // watchCursors(props, manual) {

    //     manual(function(update) {
    //         const unsubscribe = props.childCursor.observe(function(newValue, oldValue) {
    //             if(newValue && oldValue && newValue.id === oldValue.id) {
    //                 return update();
    //             }
    //         });

    //         return unsubscribe;
    //     });
    // },
    assignNewProps(props, context) {
        return {
            card: props.childCursor.deref(),
            store: context.store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
