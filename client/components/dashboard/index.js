const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {NOT_SET, paths, dashboard} = require('store/constants');

// components
const Breadcrumb = require('./breadcrumb');
const SubNav = require('./subnav');
const DecksDashboard = require('./decks');
const CardsDashboard = require('./cards');
const ReviewDashboard = require('./review');
const StashDashboard = require('./stash');

const Dashboard = React.createClass({

    propTypes: {
        view: React.PropTypes.string.isRequired
    },

    render() {

        const {view} = this.props;

        const Handler = (function() {
            switch(view) {
            case dashboard.view.cards:
                return CardsDashboard;
                break;
            case dashboard.view.decks:
                return DecksDashboard;
                break;
            case dashboard.view.review:
                return ReviewDashboard;
                break;
            case dashboard.view.stash:
                return StashDashboard;
                break;
            default:
                throw Error('unknown requested view');
                break;
            }
        }());

        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <Breadcrumb />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <SubNav />
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <Handler />
                    </div>
                </div>
            </div>
        );

    }
});

const DashboardOcclusion = either(Dashboard, null, function(props) {

    if(NOT_SET === props.view) {
        return false;
    }

    return true;
});

module.exports = orwell(DashboardOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.view)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            view: state.cursor(paths.dashboard.view).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
