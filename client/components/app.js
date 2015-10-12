const React = require('react');
const orwell = require('orwell');
const either = require('react-either');
const co = require('co');

const {NOT_SET, paths} = require('store/constants');
const {backupDB} = require('store/stateless/settings');

const App = React.createClass({

    propTypes: {
        RouteHandler: React.PropTypes.oneOfType([ React.PropTypes.func, React.PropTypes.string ])
    },

    render() {

        const {RouteHandler} = this.props;

        return (
            <div key="app">
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">wunderfoo</h1>
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
            <div key="apploading">
                <div className="row">
                    <div className="col-sm-12">
                        <header>
                            <h1 className="display-4 m-y">wunderfoo</h1>
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


const AppOcclusion = either(App, AppLoading, function(props) {

    if(NOT_SET === props.RouteHandler) {
        return false;
    }

    if(NOT_SET === props.rootDeckID) {
        return false;
    }

    return true;
});

const OrwellWrapped = orwell(AppOcclusion, {
    watchCursors(props) {
        return [
            props.rootCursor.cursor(paths.route.handler),
            props.rootCursor.cursor(paths.root)
        ];
    },
    assignNewProps(props) {
        return {
            RouteHandler: props.rootCursor.cursor(paths.route.handler).deref(),
            rootDeckID: props.rootCursor.cursor(paths.root).deref()
        };
    }
});

// container for everything
const AppContainer = React.createClass({

    getInitialState() {
        this.mounted = true;

        return {
            enableBackupButton: true
        };
    },

    componentWillMount() {
        this.mounted = true;
    },

    componentWillUnmount() {
        this.mounted = false;
    },

    onClickBackup(event) {
        event.preventDefault();
        event.stopPropagation();

        const _this = this;

        co(function*() {
            _this.setState({
                enableBackupButton: false
            });

            yield backupDB();

            _this.setState({
                enableBackupButton: true
            });
        });
    },

    render() {
        return (
            <div className="container">
                <OrwellWrapped {...this.props} />
                <hr className="m-t-lg"/>
                <footer className="m-b row">
                    <div className="col-sm-6">
                        <a href="https://github.com/dashed/wunderfoo/issues" target="_blank">{'Bugs? Issues? Ideas?'}</a>
                    </div>
                    <div className="col-sm-6">
                        <div className="btn-group p-b pull-right" role="group" aria-label="Basic example">
                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={this.onClickBackup}
                                disabled={!this.state.enableBackupButton}
                            >
                                {"Backup database"}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }
});

module.exports = AppContainer;
