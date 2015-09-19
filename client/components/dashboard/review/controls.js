const React = require('react');
const {Probe} = require('minitrue');
const orwell = require('orwell');

const ReviewControls = React.createClass({

    propTypes: {
        revealCard: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onClickRevealCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.cursor('revealCard').update(function() {
            return true;
        });
    },

    onClickSkip(event) {
        event.preventDefault();
        event.stopPropagation();
    },

    render() {

        if(!this.props.revealCard) {

            return (
                <div key="showbackbutton" className="row">
                    <div className="col-sm-6">
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={this.onClickRevealCard}>
                            {"Show Back Side"}
                        </button>
                    </div>
                    <div className="col-sm-6">
                        <button type="button" className="btn btn-info btn-lg btn-block" onClick={this.onClickSkip}>
                            {"Skip Card"}
                        </button>
                    </div>
                </div>

            );
        }

        return (
            <div className="row m-t">
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button style={{width: '50%'}} type="button" className="btn btn-danger-outline">{"Hard"}</button>
                        <button style={{width: '50%'}} type="button" className="btn btn-danger-outline">{"Fail"}</button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button style={{width: '50%'}} type="button" className="btn btn-success-outline">{"Good"}</button>
                        <button style={{width: '50%'}} type="button" className="btn btn-success-outline">{"Easy"}</button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button style={{width: '70%'}} type="button" className="btn btn-info-outline">{"Next"}</button>
                        <button style={{width: '30%'}} type="button" className="btn btn-info-outline">{"Skip"}</button>
                    </div>
                </div>
            </div>
        );

    }
});

module.exports = orwell(ReviewControls, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('revealCard')
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;

        return {
            revealCard: localstate.cursor('revealCard').deref(false)
        };
    }
});
