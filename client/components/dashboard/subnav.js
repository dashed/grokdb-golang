const React = require('react');
const orwell = require('orwell');
const classNames = require('classnames');

const {dashboard, paths} = require('store/constants');
const {toDeckCards, toDeck} = require('store/route');

const SubNav = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        isCard: React.PropTypes.bool.isRequired
    },

    onClickDecks(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.dispatch(toDeck);
    },

    onClickCards(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.store.dispatch(toDeckCards);
    },

    render() {

        const {isCard} = this.props;

        return (
            <div className="row">
                <div className="col-sm-6">
                    <div className="btn-group p-b pull-left" role="group" aria-label="Basic example">
                      <button
                        type="button"
                        className={classNames('btn', {'btn-primary': !isCard, 'btn-secondary': isCard})}
                        onClick={this.onClickDecks}>{"Decks"}</button>
                      <button
                        type="button"
                        className={classNames('btn', {'btn-primary': isCard, 'btn-secondary': !isCard})}
                        onClick={this.onClickCards}>{"Cards"}</button>
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

        const isCard = state.cursor(paths.dashboard.view).deref() === dashboard.view.cards;

        return {
            store: store,
            isCard: isCard
        };
    }

}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

