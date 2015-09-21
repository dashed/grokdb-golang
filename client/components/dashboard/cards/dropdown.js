const React = require('react');
const classNames = require('classnames');
const orwell = require('orwell');

const {toDeckCards} = require('store/route');
const {paths} = require('store/constants');

// notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

const SortDropdown = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        currentPage: React.PropTypes.number.isRequired
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
                        {"Sort By"}
                    </button>
                    <div className="dropdown-menu dropdown-menu-right" aria-labelledby="dropdownMenu1" >
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('reviewed_at', 'DESC')}>{"Recently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('reviewed_at', 'ASC')}>{"Least Recently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('times_reviewed', 'DESC')}>{"Most Frequently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('times_reviewed', 'ASC')}>{"Least Frequently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('title', 'ASC')}>{"Card Title Ascending"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('title', 'DESC')}>{"Card Title Descending"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('created_at', 'DESC')}>{"Recently Created"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('created_at', 'ASC')}>{"Least Recently Created"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('updated_at', 'DESC')}>{"Recently Updated"}</a>
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort('updated_at', 'ASC')}>{"Least Recently Updated"}</a>
                </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(SortDropdown, {
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: store,
            currentPage: state.cursor(paths.dashboard.cards.page).deref(1)
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
