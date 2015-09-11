const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
// TODO: remove/replace
// const Spinner = require('./spinner');

const constants = require('store/constants');
const {NOT_LOADED} = constants;
const {route: routePath, root: rootDeckPath} = constants.paths;

// route handler components
const DecksDashboard = require('./decksdashboard');

const App = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">butterfoo.app</h1>
                        </header>
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

const AppLoading = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">butterfoo.app</h1>
                        </header>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }
});

// show Spinner until all data dependencies are satisfied
const Occlusion = either(App, AppLoading, function(props) {

    if(NOT_LOADED === props.route) {
        return false;
    }

    if(NOT_LOADED === props.rootDeck) {
        return false;
    }

    return true;
});

const OrwellWrapped = orwell(Occlusion, {
    watchCursors(props) {
        return [
            props.rootCursor.cursor(routePath),
            props.rootCursor.cursor(rootDeckPath)
        ];
    },
    assignNewProps(props) {
        return {
            route: props.rootCursor.cursor(routePath).deref(),
            rootDeck: props.rootCursor.cursor(rootDeckPath).deref()
        };
    }
});

// container for everything
const AppContainer = React.createClass({
    render() {
        return (
            <div className="container">
                <OrwellWrapped {...this.props} />
            </div>
        );
    }
});

module.exports = AppContainer;
