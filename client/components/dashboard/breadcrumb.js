const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');

const {NOT_LOADED, paths} = require('store/constants');

const BreadcrumbChild = require('./breadcrumbchild');

const Breadcrumb = React.createClass({

    propTypes: {
        breadcrumb: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    render() {

        const {breadcrumb} = this.props;

        const lastIdx = breadcrumb.size - 1;

        const breadCrumbRendered = breadcrumb.reduce(function(accumulator, deck, index) {

            accumulator.push(
                <BreadcrumbChild key={deck.get('id')} deck={deck} active={index === lastIdx} />
            );

            return accumulator;
        }, []);

        return (
            <ol className="breadcrumb">
                {breadCrumbRendered}
            </ol>
        );
    }
});

// don't show until all data dependencies are satisfied
const BreadcrumbOcclusion = either(Breadcrumb, null, function(props) {

    if(NOT_LOADED === props.breadcrumb) {
        return false;
    }

    return true;
});

module.exports = orwell(BreadcrumbOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.breadcrumb)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            breadcrumb: state.cursor(paths.breadcrumb).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
