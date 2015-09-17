const React = require('react');
const classNames = require('classnames');

const Preview = require('components/markdownpreview');

const ReviewCardSides = React.createClass({

    propTypes: {
        sides: React.PropTypes.shape({
            front: React.PropTypes.string.isRequired,
            back: React.PropTypes.string.isRequired
        }),
        showButtons: React.PropTypes.bool.isRequired
    },

    getInitialState() {
        return {
            isFront: true
        };
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

    render() {

        const sideChooser = (function() {

            if(!this.props.showButtons) {
                return null;
            }

            return (
                <div className="card-block p-t-0">
                    <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
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
                </div>
            );

        }.call(this));

        return (
            <div>
                {sideChooser}
                <div className="card-block p-y-0">
                    <Preview text={this.getText()} />
                </div>
            </div>
        );
    }
});

module.exports = ReviewCardSides;
