const React = require('react');
const orwell = require('orwell');
const classNames = require('classnames');

const {toDeckCards} = require('store/route');
const {paths} = require('store/constants');

// magic constant
const alpha = 3;

const CardsPagination = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        numOfPages: React.PropTypes.number.isRequired,
        currentPage: React.PropTypes.number.isRequired,
        enablePrevious: React.PropTypes.bool.isRequired,
        enableNext: React.PropTypes.bool.isRequired
    },

    onClickPrevious(event) {
        event.preventDefault();
        event.stopPropagation();

        const {enablePrevious} = this.props;

        if(!enablePrevious) {
            return;
        }

        const {store, currentPage} = this.props;
        store.invoke(toDeckCards, {page: currentPage - 1});

    },

    onClickNext(event) {
        event.preventDefault();
        event.stopPropagation();

        const {enableNext} = this.props;

        if(!enableNext) {
            return;
        }

        const {store, currentPage} = this.props;
        store.invoke(toDeckCards, {page: currentPage + 1});
    },

    onClickPage(requestedPage) {

        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {store} = this.props;
            store.invoke(toDeckCards, {page: requestedPage});
        };
    },

    onClickCurrent(event) {
        event.preventDefault();
        event.stopPropagation();
    },

    render() {
        const {numOfPages, currentPage} = this.props;

        if(numOfPages <= 1) {
            return null;
        }

        const leftSide = (function() {
            const beta = currentPage - alpha;

            const __leftSide = [];

            const start = beta <= 1 ? 1 : beta;
            const end = currentPage - 1;

            for(let i = start; i <= end; i++) {
                __leftSide.push(
                    <li key={i}>
                        <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                    </li>
                );
            }
            return __leftSide;

        }.call(this));

        const rightSide = (function() {
            const beta = currentPage + alpha;

            const __rightSide = [];

            const start = currentPage + 1;
            const end = beta >= numOfPages ? numOfPages : beta;

            for(let i = start; i <= end; i++) {
                __rightSide.push(
                    <li key={i}>
                        <a href="#" onClick={this.onClickPage(i)}>{i}</a>
                    </li>
                );
            }
            return __rightSide;

        }.call(this));

        return (
            <nav style={{'textAlign': 'center'}}>
                <ul className="pagination m-y-0 p-y-0">
                    <li className={classNames({'disabled': !this.props.enablePrevious})}>
                        <a href="#" aria-label="Previous" onClick={this.onClickPrevious}>
                            <span aria-hidden="true">{"Previous"}</span>
                            <span className="sr-only">{"Previous"}</span>
                        </a>
                    </li>
                    {leftSide}
                    <li className="active">
                        <a href="#" onClick={this.onClickCurrent}>{currentPage} <span className="sr-only">{"(current)"}</span></a>
                    </li>
                    {rightSide}
                    <li className={classNames({'disabled': !this.props.enableNext})}>
                        <a href="#" aria-label="Next" onClick={this.onClickNext}>
                            <span aria-hidden="true">{"Next"}</span>
                            <span className="sr-only">{"Next"}</span>
                        </a>
                    </li>
                </ul>
            </nav>
        );
    }
});

module.exports = orwell(CardsPagination, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.cards.numOfPages),
            state.cursor(paths.dashboard.cards.page)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        const numOfPages = state.cursor(paths.dashboard.cards.numOfPages).deref(1);
        const currentPage = state.cursor(paths.dashboard.cards.page).deref(1);

        return {
            store: store,
            numOfPages: numOfPages,
            currentPage: currentPage,
            enablePrevious: currentPage != 1,
            enableNext: currentPage < numOfPages
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
