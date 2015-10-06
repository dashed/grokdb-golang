const React = require('react');
const Immutable = require('immutable');


const {tabSize} = require('store/constants');

const ListFilter = React.createClass({

    propTypes: {
        list: React.PropTypes.instanceOf(Immutable.List).isRequired,
        labelForItem: React.PropTypes.func.isRequired
    },

    render() {

        const {list, labelForItem} = this.props;

        const renderedList = list.map(function(value, index) {

            const label = labelForItem(value, index);

            return (
                <a key={`${label}.${index}`} href="#" className="list-group-item">{label}</a>
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
