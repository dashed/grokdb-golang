const React = require('react');
const Immutable = require('immutable');
const classNames = require('classnames');


const {tabSize} = require('store/constants');

const ListFilter = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        labelForItem: React.PropTypes.func.isRequired,
        isItemActive: React.PropTypes.func.isRequired,
        onClickItemToggle: React.PropTypes.func.isRequired,
        onClickItemLabel: React.PropTypes.func.isRequired,
        activeLabel: React.PropTypes.string.isRequired,
        notActiveLabel: React.PropTypes.string.isRequired
    },

    onClickItemToggle(value) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {onClickItemToggle} = this.props;
            onClickItemToggle.call(void 0, value);
        };
    },

    onClickItemLabel(value) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();

            const {onClickItemLabel} = this.props;
            onClickItemLabel.call(void 0, value);
        };
    },

    render() {

        const {list, labelForItem, isItemActive, activeLabel, notActiveLabel} = this.props;

        const renderedList = list.reduce((reduction, value, index) => {
            const label = labelForItem(value, index);

            const active = !!isItemActive(value);

            reduction.push(
                <li key={`${label}.${index}.li`} className="list-group-item">
                    <p className="list-group-item-text pull-right">
                        <button
                            type="button"
                            className={classNames('btn', 'btn-sm', {'btn-primary': active, 'btn-secondary': !active})}
                            onClick={this.onClickItemToggle(value)}
                        >{active ? activeLabel : notActiveLabel}</button>
                    </p>
                    <h4 className="list-group-item-heading">
                        <a
                            href="#"
                            onClick={this.onClickItemLabel(value)}
                        >
                            {label}
                        </a>
                    </h4>
                </li>
            );


            return reduction;
        }, []);

        return (
            <div style={tabSize} className="list-group">
                {renderedList}
            </div>
        );
    }
});

module.exports = ListFilter;

// <a
//     style={{width: '50%'}}
//     key={`${label}.${index}.label`}
//     href="#"
//     className={classNames('list-group-item', 'pull-left',  {active: !!isItemActive(value)})}
//     onClick={this.onClickListItem(value)}
// >{label}</a>
