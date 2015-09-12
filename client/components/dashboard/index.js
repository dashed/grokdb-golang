const React = require('react');
const orwell = require('orwell');

// const {paths} = require('store/constants');

// components
const Breadcrumb = require('./breadcrumb');
const SubNav = require('./subnav');
const DecksDashboard = require('./decks');

const Dashboard = React.createClass({
    render() {

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
                        <DecksDashboard />
                    </div>
                </div>
            </div>
        );

    }
});

module.exports = orwell(Dashboard, {});
