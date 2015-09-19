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
                    <button type="button" className="btn btn-success-outline btn-lg btn-block">{"Success"}</button>
                </div>
                <div className="col-sm-4">
                    <button type="button" className="btn btn-danger-outline btn-lg btn-block">{"Fail"}</button>
                </div>
                <div className="col-sm-4">
                    <button type="button" className="btn btn-info btn-lg btn-block">{"Next Card"}</button>
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
