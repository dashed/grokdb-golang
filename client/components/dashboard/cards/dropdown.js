const React = require('react');
const classNames = require('classnames');
const orwell = require('orwell');
const _ = require('lodash');

const {toDeckCards} = require('store/route');
const {paths} = require('store/constants');

// notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

const SORT = [
    {
        sort: 'reviewed_at',
        order: 'DESC',
        label: 'Recently Reviewed'
    },
    {
        sort: 'reviewed_at',
        order: 'ASC',
        label: 'Least Recently Reviewed'
    },
    {
        sort: 'times_reviewed',
        order: 'DESC',
        label: 'Most Frequently Reviewed'
    },
    {
        sort: 'times_reviewed',
        order: 'ASC',
        label: 'Least Frequently Reviewed'
    },
    {
        sort: 'title',
        order: 'ASC',
        label: 'Card Title Ascending'
    },
    {
        sort: 'title',
        order: 'DESC',
        label: 'Card Title Descending'
    },
    {
        sort: 'created_at',
        order: 'DESC',
        label: 'Recently Created'
    },
    {
        sort: 'created_at',
        order: 'ASC',
        label: 'Least Recently Created'
    },
    {
        sort: 'updated_at',
        order: 'DESC',
        label: 'Recently Updated'
    },
    {
        sort: 'updated_at',
        order: 'ASC',
        label: 'Least Recently Updated'
    }
];

const SortDropdown = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        currentPage: React.PropTypes.number.isRequired,
        sort: React.PropTypes.string.isRequired,
        order: React.PropTypes.string.isRequired
    },

    getInitialState() {
        return {
            open: false
        };
    },

    componentDidMount: function () {
        document.body.addEventListener('click', this.handleBodyClick);
    },

    componentWillUnmount: function () {
        document.body.removeEventListener('click', this.handleBodyClick);
    },

    handleBodyClick: function (event) {


        if(!this.state.open || event.target == React.findDOMNode(this.refs.sortbutton)) {
            return;
        }

        this.setState({
            open: !this.state.open
        });
    },

    dropdownClickHandler: function(e) {
        event.preventDefault();
        event.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    },

    onClickDropdown(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            open: !this.state.open
        });
    },

    onClickSort(sort, order) {

        const {store, currentPage} = this.props;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();
            store.invoke(toDeckCards, {page: currentPage, sort: sort, order: order});
        }.bind(this);
    },

    getLabel() {
        const {sort, order} = this.props;

        const foo = _.find(SORT, function(blueprint) {
            return blueprint.sort == sort && blueprint.order == order;
        });

        return foo.label;
    },

    render() {

        return (
            <div className="pull-right">
                <div className={classNames('dropdown', {open: this.state.open})}>
                    <button
                        ref="sortbutton"
                        className="btn btn-sm btn-secondary dropdown-toggle"
                        type="button"
                        id="dropdownMenu1"
                        data-toggle="dropdown"
                        aria-haspopup="true"
                        aria-expanded="false"

                        onClick={this.onClickDropdown}>
                        {`Sort By ${this.getLabel()}`}
                    </button>
                    <div className="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1" >
                        {(function() {
                            return _.reduce(SORT, function(buttons, blueprint, idx) {
                                buttons.push(
                                    <a key={idx} className="dropdown-item sortbutton" href="#" onClick={this.onClickSort(blueprint.sort, blueprint.order)}>{blueprint.label}</a>
                                );
                                return buttons;
                            }, [], this);
                        }.call(this))}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(SortDropdown, {
    watchCursors(props, manual, context) {
        const state = context.store.state();
        return state.cursor(paths.dashboard.cards.sort);
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: store,
            currentPage: state.cursor(paths.dashboard.cards.page).deref(1),
            sort: state.cursor(paths.dashboard.cards.sort).deref('reviewed_at'),
            order: state.cursor(paths.dashboard.cards.order).deref('DESC')
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});

