const React = require('react');
const Preview = require('components/markdownpreview');
const orwell = require('orwell');
const Immutable = require('immutable');
const {Probe} = require('minitrue');

const ReviewMeta = React.createClass({

    propTypes: {
        reviewCard: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        showDescription: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onClickShowDescription(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate, showDescription} = this.props;
        localstate.update(function(map) {
            return map.set('showDescription', !showDescription);
        });
    },

    render() {

        const {showDescription, reviewCard} = this.props;

        return (
            <div>
                <div className="card">
                    <div className="card-block">
                        <div className="btn-group btn-group-sm" role="group" aria-label="Basic example">
                            <button type="button" className="btn btn-secondary" onClick={this.onClickShowDescription}>
                                {`${showDescription ? 'Hide' : 'Show'} Description`}
                            </button>
                        </div>
                        <hr/>
                        {(function() {

                            if(!showDescription) {
                                return (
                                    <p className="card-text">
                                        <i><small className="text-muted">{`Description hidden`}</small></i>
                                    </p>
                                );
                            }

                            const description = reviewCard.get('description');

                            return (<Preview text={description} />);
                        }.call(this))}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(ReviewMeta, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('showDescription')
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;

        return {
            showDescription: localstate.cursor('showDescription').deref(false)
        };
    }
});
