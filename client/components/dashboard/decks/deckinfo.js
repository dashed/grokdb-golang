const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');

const {paths, NOT_SET} = require('store/constants');
const {saveDeck} = require('store/decks');

const DeckInfo = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        editingDeck: React.PropTypes.bool.isRequired
    },

    getInitialState() {

        const {deck} = this.props;

        return {
            callback: this.saveDeck,

            name: deck.get('name'),
            description: deck.get('description')
        };
    },

    onChangeName(event) {
        this.setState({
            name: event.target.value
        });
    },

    saveDeck() {

        const {store, editingDeck} = this.props;

        if(!editingDeck) {
            return;
        }

        // TODO: need to validate deck here
        if(!_.isString(this.state.name) || this.state.name.trim().length <= 0) {
            return;
        }

        store.dispatch(saveDeck, {
            name: this.state.name,
            description: this.state.description
        });

        this.setState({
            name: NOT_SET,
            description: NOT_SET
        });
    },

    setUpHandler(props) {

        const {editingDeck} = props;

        this.props.store.state().cursor(paths.editingDeckCallback).update(() => {
            return editingDeck ? this.state.callback : NOT_SET;
        });

        const {deck} = props;

        if(this.state.name === NOT_SET) {
            this.setState({
                name: deck.get('name'),
            });
        }
    },

    componentWillMount() {
        this.setUpHandler.call(this, this.props);
    },

    componentWillReceiveProps(nextProps) {
        this.setUpHandler.call(this, nextProps);
    },

    render() {

        const {editingDeck} = this.props;

        if(editingDeck) {
            return (
                <div>
                    <fieldset className="form-group">
                        <input type="text" className="form-control" id="deckName" placeholder="Deck Name" value={this.state.name} onChange={this.onChangeName} />
                    </fieldset>
                    <fieldset className="form-group">
                        <textarea className="form-control" id="deckDescription" rows="3" placeholder="Deck Description"></textarea>
                    </fieldset>
                </div>
            );
        }

        const {deck} = this.props;

        return (
            <div className="m-b">
                <h4 className="card-title">{deck.get('name')}</h4>
                <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
            </div>
        );
    }
});


module.exports = orwell(DeckInfo, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.editingDeck),
            state.cursor(paths.currentDeck)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            deck: state.cursor(paths.currentDeck).deref(),
            editingDeck: state.cursor(paths.editingDeck).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
