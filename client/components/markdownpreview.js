/*global MathJax: true */
/*eslint new-cap: [2, {"capIsNewExceptions": ["MathJax.Hub.Queue", "Remove"]}]*/

const React = require('react');
const _ = require('lodash');

const {markdown} = require('store/constants');


const MarkdownPreview = React.createClass({

    propTypes: {
        text: React.PropTypes.string.isRequired,
        // onGenerateMarkdown: React.PropTypes.func
    },

    // getDefaultProps() {
    //     return {
    //         onGenerateMarkdown: () => void 0
    //     };
    // },

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
            <div ref="output" dangerouslySetInnerHTML={this.generateMarkdown(this.props.text)} />
        );
    }
});

module.exports = MarkdownPreview;
