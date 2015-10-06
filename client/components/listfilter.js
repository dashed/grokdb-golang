const React = require('react');
const Immutable = require('immutable');
const classNames = require('classnames');


const {tabSize} = require('store/constants');

const ListFilter = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        labelForItem: React.PropTypes.func.isRequired,
        isItemActive: React.PropTypes.func.isRequired,
        onClickItem: React.PropTypes.func.isRequired
    },

    onClickListItem(value) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {onClickItem} = this.props;
            onClickItem.call(void 0, value);
        };
    },

    render() {

        const {list, labelForItem, isItemActive} = this.props;

        const renderedList = list.map((value, index) => {

            const label = labelForItem(value, index);

            return (
                <a
                    key={`${label}.${index}`}
                    href="#"
                    className={classNames('list-group-item', {active: !!isItemActive(value)})}
                    onClick={this.onClickListItem(value)}
                >{label}</a>
            );
        });

        return (
            <div style={tabSize} className="list-group">
                {renderedList}
            </div>
        );
    }
});

module.exports = ListFilter;
