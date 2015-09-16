const React = require('react');
const TextareaAutosize = require('react-textarea-autosize');
const classNames = require('classnames');

const Preview = require('components/markdownpreview');
const {tabSize} = require('store/constants');

const CardNewSides = React.createClass({

    propTypes: {
        onChange: React.PropTypes.func.isRequired,
        sides: React.PropTypes.shape({
            front: React.PropTypes.string.isRequired,
            back: React.PropTypes.string.isRequired
        })
    },

    getInitialState() {
        return {
            isWrite: true,
            isFront: true
        };
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

    onClickFront(event) {
        event.preventDefault();
        event.stopPropagation();

        if(this.state.isFront) {
            return;
        }

        this.setState({
            isFront: true
        });
    },

    onClickBack(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.state.isFront) {
            return;
        }

        this.setState({
            isFront: false
        });
    },

    getText() {
        return this.state.isFront ? this.props.sides.front : this.props.sides.back;
    },

    onChange(event) {
        this.props.onChange({
            [this.state.isFront ? 'front' : 'back']: event.target.value
        });
    },

    render() {

        const sideChooser = (function() {

            return (
                <div className="btn-group btn-group-sm m-b" role="group" aria-label="Basic example">
                    <button
                        type="button"
                        className={classNames('btn', {'btn-primary': this.state.isFront, 'btn-secondary': !this.state.isFront})}
                        onClick={this.onClickFront}
                    >{"Front"}</button>
                    <button
                        type="button"
                        className={classNames('btn', {'btn-primary': !this.state.isFront, 'btn-secondary': this.state.isFront})}
                        onClick={this.onClickBack}
                    >{"Back"}</button>
                </div>
            );

        }.call(this));

        const Visual = (function() {
            if(!this.state.isWrite) {
                return (
                    <Preview key="preview" text={this.getText()} />
                );
            }

            return (
                <TextareaAutosize
                    key="textarea"
                    useCacheForDOMMeasurements
                    minRows={6}
                    maxRows={10}
                    className="form-control"
                    id="deckSide"
                    placeholder={`${this.state.isFront ? 'Front' : 'Back' } entry`}
                    onChange={this.onChange}
                    value={this.getText()}
                />
            );
        }.call(this));


        return (
            <div>
                <div className="card-block">
                    {sideChooser}
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
            </div>
        );
    }
});

module.exports = CardNewSides;
