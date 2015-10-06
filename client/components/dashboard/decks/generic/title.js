const React = require('react');
const orwell = require('orwell');
const {Probe} = require('minitrue');

const {filterInt} = require('store/utils');

const GenericDeckTitle = React.createClass({

    propTypes: {
        name: React.PropTypes.string.isRequired,
        deckID: React.PropTypes.number.isRequired,
        editMode: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    onChangeName(event) {

        const {localstate} = this.props;

        localstate.cursor(['deck', 'name']).update(function() {
            return event.target.value;
        });
    },

    render() {

        const {deckID, name, editMode} = this.props;

        if(editMode) {
            return (
                <fieldset className="form-group m-y-0">
                    <input
                        type="text"
                        className="form-control"
                        id="stashTitle"
                        placeholder={`Name for deck #${deckID}`}
                        value={name}
                        onChange={this.onChangeName}
                    />
                </fieldset>
            );
        }

        return (
            <h4 className="card-title m-y-0">
                <span className="text-muted lead">{`#${deckID}`}</span>
                {` `}
                {name}
            </h4>
        );
    }
});

module.exports = orwell(GenericDeckTitle, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('editMode'),
            localstate.cursor(['deck', 'name'])
        ];
    },
    assignNewProps(props) {

        const {localstate} = props;

        return {
            name: localstate.cursor(['deck', 'name']).deref(''),
            deckID: filterInt(localstate.cursor(['deck', 'id']).deref(0)),
            editMode: localstate.cursor('editMode').deref(false)
        };
    }
});
