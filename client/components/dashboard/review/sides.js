const React = require('react');
const classNames = require('classnames');
const {Probe} = require('minitrue');
const orwell = require('orwell');

const Preview = require('components/markdownpreview');

const ReviewCardSides = React.createClass({

    propTypes: {
        sides: React.PropTypes.shape({
            front: React.PropTypes.string.isRequired,
            back: React.PropTypes.string.isRequired
        }),
        showBackSide: React.PropTypes.bool.isRequired,
        revealCard: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onClickFront(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.cursor('showBackSide').update(function() {
            return false;
        });
    },

    onClickBack(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.cursor('showBackSide').update(function() {
            return true;
        });
    },

    getText() {

        const {showBackSide} = this.props;

        return showBackSide ?
            this.props.sides.back : this.props.sides.front;
    },

    render() {

        const sideChooser = (function() {

            if(!this.props.revealCard) {
                return null;
            }

            const {showBackSide} = this.props;

            return (
                <div className="card-block p-t-0">
                    <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                        <button
                            type="button"
                            className={classNames('btn', {'btn-primary': !showBackSide, 'btn-secondary': showBackSide})}
                            onClick={this.onClickFront}
                        >{"Front"}</button>
                        <button
                            type="button"
                            className={classNames('btn', {'btn-primary': showBackSide, 'btn-secondary': !showBackSide})}
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

module.exports = orwell(ReviewCardSides, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('revealCard'),
            localstate.cursor('showBackSide')
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;

        return {
            revealCard: localstate.cursor('revealCard').deref(false),
            showBackSide: localstate.cursor('showBackSide').deref(false)
        };
    }
});
