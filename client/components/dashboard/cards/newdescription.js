const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const classNames = require('classnames');

const Preview = require('components/markdownpreview');
const {tabSize} = require('store/constants');

const CardNewDescription = React.createClass({

    propTypes: {
        description: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired
    },

    onClickWrite(event) {
        event.preventDefault();
        event.stopPropagation();

        if(this.state.isWrite) {
            return;
        }

        this.setState({
            isWrite: true
        });
    },

    onClickPreview(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.state.isWrite) {
            return;
        }

        this.setState({
            isWrite: false
        });
    },

    getInitialState() {
        return {
            isWrite: true
        };
    },

    onChange(event) {
        this.props.onChange(event.target.value);
    },

    render() {

        const Visual = (function() {
            if(!this.state.isWrite) {
                return (
                    <Preview key="preview" text={this.props.description} />
                );
            }

            return (
                <TextareaAutosize
                    key="textarea"
                    useCacheForDOMMeasurements
                    minRows={2}
                    maxRows={10}
                    className="form-control"
                    id="deckDescription"
                    placeholder="Card Description (optional)"
                    onChange={this.onChange}
                    value={this.props.description}
                />
            );
        }.call(this));

        return (
            <div className="card-block">
                <ul style={tabSize} className="nav nav-tabs m-b">
                    <li className="nav-item">
                        <a
                            href={'#'}
                            className={classNames('nav-link', {active: this.state.isWrite})}
                            onClick={this.onClickWrite}
                        >{"Write"}</a>
                    </li>
                    <li className="nav-item">
                        <a
                            href={'#'}
                            className={classNames('nav-link', {active: !this.state.isWrite})}
                            onClick={this.onClickPreview}
                        >{"Preview"}</a>
                    </li>
                </ul>

                {Visual}

            </div>
        );
    }
});

module.exports = CardNewDescription;
