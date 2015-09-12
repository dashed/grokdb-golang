const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {paths} = require('store/constants');

const DeckSettings = React.createClass({

    render() {
        return (
            <div>
                <div className="card-header">
                    {"Settings"}
                </div>
                <div className="card-block">
                    <strong>Delete this deck</strong>
                    <p className="card-text">
                        {"Once you delete a deck, there is no going back. Please be certain."}
                        <button type="button" className="btn btn-danger btn-sm pull-right">{"Delete this deck"}</button>
                    </p>
                </div>
            </div>
        );
    }

});

const DeckSettingsOcclusion = either(DeckSettings, null, function(props) {
    return props.editingDeck;
});

module.exports = orwell(DeckSettingsOcclusion, {
    watchCursors(props, manual, context) {

        const state = context.store.state();

        return [
            state.cursor(paths.editingDeck)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            editingDeck: state.cursor(paths.editingDeck).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
