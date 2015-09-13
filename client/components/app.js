const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
// TODO: remove/replace
// const Spinner = require('./spinner');

const constants = require('store/constants');
const {NOT_LOADED, paths} = constants;

const App = React.createClass({

    propTypes: {
        RouteHandler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        const {RouteHandler} = this.props;

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
                        <RouteHandler />
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
                        <p>Loading app...</p>
                    </div>
                </div>
            </div>
        );
    }
});

// show Spinner until all data dependencies are satisfied
const AppOcclusion = either(App, AppLoading, function(props) {

    if(NOT_LOADED === props.RouteHandler) {
        return false;
    }

    if(NOT_LOADED === props.rootDeckID) {
        return false;
    }

    return true;
});

const OrwellWrapped = orwell(AppOcclusion, {
    watchCursors(props) {
        return [
            props.rootCursor.cursor(paths.routeHandler),
            props.rootCursor.cursor(paths.root)
        ];
    },
    assignNewProps(props) {
        return {
            RouteHandler: props.rootCursor.cursor(paths.routeHandler).deref(),
            rootDeckID: props.rootCursor.cursor(paths.root).deref()
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
