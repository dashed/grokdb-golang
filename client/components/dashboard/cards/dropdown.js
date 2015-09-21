const React = require('react');
const classNames = require('classnames');

// notes: https://github.com/facebook/react/issues/579#issuecomment-60841923

const SortDropdown = React.createClass({

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

    onClickSort(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('sort');
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
                        <a className="dropdown-item sortbutton" href="#" onClick={this.onClickSort}>{"Recently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Least Recently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Most Frequently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Least Frequently Reviewed"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Card Title Ascending"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Card Title Descending"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Recently Created"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Least Recently Created"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Recently Updated"}</a>
                        <a className="dropdown-item sortbutton" href="#">{"Least Recently Updated"}</a>
                </div>
                </div>
            </div>
        );
    }
});

module.exports = SortDropdown;
