const React = require('react');

const ReviewControls = React.createClass({

    propTypes: {
        showBackSide: React.PropTypes.bool.isRequired,
        onClickShowBackSide: React.PropTypes.func.isRequired
    },

    onClickShowBackSide(event) {
        event.preventDefault();
        event.stopPropagation();

        this.props.onClickShowBackSide.call(void 0);
    },

    render() {

        if(!this.props.showBackSide) {

            return (
                <div key="showbackbutton" className="row">
                    <div className="col-sm-6">
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={this.onClickShowBackSide}>
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

module.exports = ReviewControls;

