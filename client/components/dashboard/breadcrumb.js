const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const Immutable = require('immutable');

const {NOT_LOADED, paths} = require('store/constants');

const Breadcrumb = React.createClass({

    propTypes: {
        breadcrumb: React.PropTypes.instanceOf(Immutable.List).isRequired
    },

    render() {

        const {breadcrumb} = this.props;

        const breadCrumbRendered = breadcrumb.reduce(function(accumulator, deck) {

            accumulator.push(
                // TODO: href to be meaningful
                <li key={deck.get('id')}>
                    <a href="#">{deck.get('name')}</a>
                </li>
            );

            return accumulator;
        }, []);

        return (
            <ol className="breadcrumb">
                <li><a href="#">{""}</a></li>
                {breadCrumbRendered}
                <li>{" "}</li>
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
