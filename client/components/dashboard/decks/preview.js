/*global MathJax: true */
/*eslint new-cap: [2, {"capIsNewExceptions": ["MathJax.Hub.Queue", "Remove"]}]*/

const React = require('react');
const _ = require('lodash');

const {markdown} = require('store/constants');


const DeckPreview = React.createClass({

    propTypes: {
        text: React.PropTypes.string.isRequired
    },

    generateMarkdown(input) {
        return {
            __html: markdown.render(input)
        };
    },

    componentDidUpdate() {

        MathJax.Hub.Queue(['Typeset', MathJax.Hub, React.findDOMNode(this.refs.output)]);
    },

    componentDidMount() {
        MathJax.Hub.Queue(['Typeset', MathJax.Hub, React.findDOMNode(this.refs.output)]);
    },

    componentWillUnmount() {
        _.each(MathJax.Hub.getAllJax(React.findDOMNode(this.refs.output)), function(jax) {
            jax.Remove();
        });
    },

    render() {
        return (
            <div>
                <div ref="output" dangerouslySetInnerHTML={this.generateMarkdown(this.props.text)} />
            </div>
        );
    }
});

module.exports = DeckPreview;
