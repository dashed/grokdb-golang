const React = require('react');
const orwell = require('orwell');
const either = require('react-either');

const {paths} = require('store/constants');
const DeleteDeck = require('./delete');

const DeckSettings = React.createClass({

    render() {

        return (
            <div>
                <div className="card-header p-y-0">
                    {""}
                </div>
                <div className="card-header">
                    <strong>{"Settings"}</strong>
                </div>
                <div className="card-block">
                    <strong className="text-muted">{"Move this deck"}</strong>
                    <p className="card-text">
                        {"description TBA"}
                    </p>
                </div>
                <DeleteDeck />
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
            state.cursor(paths.dashboard.decks.editing)
        ];
    },
    assignNewProps(props, context) {

        const state = context.store.state();

        return {
            store: context.store,
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
