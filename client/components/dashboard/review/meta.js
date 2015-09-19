const React = require('react');
const Preview = require('components/markdownpreview');

const ReviewMeta = React.createClass({

    onClickShowDescription(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            showDescription: !this.props.showDescription
        });
    },

    render() {
        return (
            <div>meta</div>
        );
    }
});

module.exports = ReviewMeta;
