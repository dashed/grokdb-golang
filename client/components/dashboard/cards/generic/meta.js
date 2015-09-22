const React = require('react');

const CardDelete = require('./delete');

const GenericCardMeta = React.createClass({

    render() {
        return (
            <div>
                <div className="card-block">
                    <strong className="text-muted">{'Move this card'}</strong>
                    <br/>
                    <div className="btn-group" role="group" aria-label="Basic example">
                        tba
                    </div>
                </div>
                <CardDelete />
            </div>
        );
    }
});

module.exports = GenericCardMeta;
