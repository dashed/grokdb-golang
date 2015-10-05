const React = require('react');
const either = require('react-either');
const orwell = require('orwell');
const Immutable = require('immutable');
const moment = require('moment');
const {Probe} = require('minitrue');
const _ = require('lodash');

const {flow, stateless} = require('store/utils');
const {setDeck, popFromBreadcrumb, pushManyOntoBreadcrumb, setChildren} = require('store/decks');
const {fetchChildren} = require('store/stateless/decks');

const navigateToParentDeck = flow(
    // decks
    popFromBreadcrumb,
    setDeck,
    stateless(fetchChildren),
    setChildren

    // route
    // applyPageArgs,
    // toDeckCards
);

const navigateToChildDeck = flow(
    // decks
    pushManyOntoBreadcrumb,
    setDeck,
    stateless(fetchChildren),
    setChildren

    // route
    // applyPageArgs,
    // toDeckCards
);

const CardChild = React.createClass({

    propTypes: {
        card: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,
        sublocalstate: React.PropTypes.instanceOf(Probe).isRequired,
        deckPath: React.PropTypes.array.isRequired,
        breadcrumbLength: React.PropTypes.number.isRequired
    },

    onClickDeck(deckPath, idx) {

        const {localstate, breadcrumbLength} = this.props;
        const currentDeckIdx = breadcrumbLength - 1;

        const flowPath = idx < currentDeckIdx ? navigateToParentDeck : navigateToChildDeck;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();

            const deck = deckPath[idx];

            const sliced = idx < currentDeckIdx ? [] : _.slice(deckPath, currentDeckIdx + 1, idx + 1);

            const afterCardsListDeckChange = localstate.cursor('afterCardsListDeckChange').deref();

            afterCardsListDeckChange({
                flowPath: flowPath,
                deck: deck,
                deckID: deck.get('id'),
                decks: sliced // for pushManyOntoBreadcrumb
            });
        };
    },

    onClickCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate, card} = this.props;

        const changeToCard = localstate.cursor('changeToCard').deref();
        changeToCard({card, cardID: card.get('id')});
    },

    deckPathVisual() {

        const {deckPath = [], breadcrumbLength} = this.props;

        const currentDeckIdx = breadcrumbLength - 1;

        // deck path
        const list = _.reduce(deckPath, function(lst, deck) {
            const name = deck.get('name');
            lst.push(' / ');

            const currIdx = ((lst.length-1)/2);

            if(currIdx == currentDeckIdx) {
                lst.push(
                    `${name}`
                );
            } else {
                lst.push(
                    <a href="#" key={lst.length} onClick={this.onClickDeck(deckPath, currIdx)}>{name}</a>
                );
            }

            return lst;
        }, [], this);

        return (
            <p className="list-group-item-text">
                <small>
                    <strong>{`Deck: `}</strong>
                    {list}
                </small>
            </p>
        );
    },

    generateSummary() {

        const {card} = this.props;

        // count times reviewed

        const timesReviewed = `Reviewed ${card.getIn(['review', 'times_reviewed'])} times.`;

        // datetime of when last reviewed

        const offset = new Date().getTimezoneOffset();
        const lastReviewedDatetime = moment.unix(card.getIn(['review', 'updated_at'])).utcOffset(-offset);;

        const createdAt = moment.unix(card.get('created_at')).utcOffset(-offset);
        const wasReviewed = Math.abs(lastReviewedDatetime.diff(createdAt)) <= 250 ? false : true;

        const lastReviewed = wasReviewed ? `Last reviewed ${lastReviewedDatetime.fromNow()}.` : `Hasn't been reviewed.`;

        // score

        const score = `Score of ${100-card.getIn(['review', 'score']).toPrecision(5)*100}%`;

        return (
            <p className="list-group-item-text">
                <small className="text-muted">{`#${card.get('id')}`}</small>
                {` `}
                <small>{`${timesReviewed} ${lastReviewed} ${score}`}</small>
            </p>
        );
    },

    render() {

        const {card} = this.props;
        const title = card.get('title');

        return (
            <div className="list-group-item carditem">
                <h4 className="list-group-item-heading"><a href="#" onClick={this.onClickCard}>{title}</a></h4>
                {this.generateSummary()}
                {this.deckPathVisual()}
            </div>
        );
    }
});

// hide until data deps are satisfied
const CardChildOcclusion = either(CardChild, null, function(props) {

    const {deckPath, card} = props;

    if(!Immutable.Map.isMap(card)) {
        return false;
    }

    if(!_.isArray(deckPath)) {
        return false;
    }

    return true;
});

module.exports = orwell(CardChildOcclusion, {
    watchCursors(props) {

        const {sublocalstate, childCursor} = props;

        const card = childCursor.deref();

        return [
            sublocalstate.cursor(['deckPaths', card.get('id')]),
            childCursor
        ];

    },
    assignNewProps(props) {

        const {sublocalstate, childCursor} = props;

        const card = childCursor.deref();

        if(!Immutable.Map.isMap(card)) {
            return {};
        }

        const cardID = card.get('id');
        const deckPath = sublocalstate.cursor(['deckPaths', cardID]).deref();

        if(!_.isArray(deckPath)) {
            const requestDeckPath = sublocalstate.cursor('requestDeckPath').deref();
            requestDeckPath.call(void 0, cardID, card.get('deck_path'));
        }

        return {
            card: card,
            deckPath: deckPath
        };
    }
});
