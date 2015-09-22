const React = require('react');
const {Probe} = require('minitrue');

const CardDelete = require('./delete');

const GenericCardMeta = React.createClass({

    propTypes: {
        onClickDelete: React.PropTypes.func.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    render() {

        const {onClickDelete, localstate} = this.props;

        return (
            <div>
                <div className="card-block">
                    <strong className="text-muted">{'Move this card'}</strong>
                    <br/>
                    <div className="btn-group" role="group" aria-label="Basic example">
                        tba
                    </div>
                </div>
                <CardDelete localstate={localstate} onClickDelete={onClickDelete} />
            </div>
        );
    }
});

module.exports = GenericCardMeta;
