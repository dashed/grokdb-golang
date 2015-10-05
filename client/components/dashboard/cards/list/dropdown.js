const React = require('react');
const classNames = require('classnames');
const orwell = require('orwell');
const _ = require('lodash');
const {Probe} = require('minitrue');

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
        currentPage: React.PropTypes.number.isRequired,
        sort: React.PropTypes.string.isRequired,
        order: React.PropTypes.string.isRequired,

        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    getInitialState() {
        return {
            open: false
        };
    },

    // notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

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

        const {localstate, currentPage} = this.props;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();

            const afterCardsListSort = localstate.cursor('afterCardsListSort').deref();
            afterCardsListSort({pageNum: currentPage, sort: sort, order: order});
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
    watchCursors(props) {

        const {localstate} = props;

        return [
            localstate.cursor('sort')
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            currentPage: localstate.cursor('currentPage').deref(1),
            sort: localstate.cursor('sort').deref('reviewed_at'),
            order: localstate.cursor('order').deref('DESC')
        };
    }
});
