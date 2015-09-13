const React = require('react');
const {Probe} = require('minitrue');

const store = require('store');
// const superhot = require('superhot');
const App = require('components/app');

// render app
// setTimeout(function() {
//     console.log(String(store.state()));
// }, 1000);

// NOTE: As of react v0.13, contexts are an undocumented feature
// NOTE: As of react v0.13, React.withContext() is deprecated.
// See: https://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html
const WithContext = React.createClass({

    childContextTypes: {
        store: React.PropTypes.object.isRequired,
        rootCursor: React.PropTypes.instanceOf(Probe).isRequired
    },

    getChildContext: function() {
        return {
            store: store,
            rootCursor: store.state()
        };
    },

    render: function() {
        return (<App {...this.props} />);
    }
});

React.render(<WithContext rootCursor={store.state()} />, document.body);
