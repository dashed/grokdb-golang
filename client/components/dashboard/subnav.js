const React = require('react');
const orwell = require('orwell');
const classNames = require('classnames');

const {dashboard, paths} = require('store/constants');
// const {applyDeckArgs} = require('store/decks');
const {toDeckCards, toDeck, toReview} = require('store/route');

const SubNav = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isCard: React.PropTypes.bool.isRequired,
        isDeck: React.PropTypes.bool.isRequired,
        isReview: React.PropTypes.bool.isRequired
    },

    onClickDecks(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.invoke(toDeck);
    },

    onClickCards(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.invoke(toDeckCards);
    },

    onClickReview(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.invoke(toReview);
    },

    render() {

        const {isCard, isDeck, isReview} = this.props;

        return (
            <div className="row">
                <div className="col-sm-6">
                    <div className="btn-group p-b pull-left" role="group" aria-label="Basic example">
                      <button
                        type="button"
                        className={classNames('btn', {'btn-primary': isDeck, 'btn-secondary': !isDeck})}
                        onClick={this.onClickDecks}>{"Decks"}</button>
                      <button
                        type="button"
                        className={classNames('btn', {'btn-primary': isCard, 'btn-secondary': !isCard})}
                        onClick={this.onClickCards}>{"Cards"}</button>
                      <button
                        type="button"
                        className={classNames('btn', {'btn-primary': isReview, 'btn-secondary': !isReview})}
                        onClick={this.onClickReview}>{"Review"}</button>
                    </div>
                </div>
                <div className="col-sm-6">
                    <div className="btn-group p-b pull-right" role="group" aria-label="Basic example">
                      <button type="button" className="btn btn-secondary">{"Quizzes"}</button>
                      <button type="button" className="btn btn-secondary">{"Labels"}</button>
                      <button type="button" className="btn btn-secondary">{"Settings"}</button>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(SubNav, {

    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.view)
        ];
    },

    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        const currentView = state.cursor(paths.dashboard.view).deref();

        const isCard = currentView === dashboard.view.cards;
        const isDeck = currentView === dashboard.view.decks;
        const isReview = currentView === dashboard.view.review;

        return {
            store: store,
            isCard: isCard,
            isDeck: isDeck,
            isReview: isReview
        };
    }

}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

