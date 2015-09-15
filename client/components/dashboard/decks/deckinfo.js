const React = require('react');
const orwell = require('orwell');
const Immutable = require('immutable');
const _ = require('lodash');
const classNames = require('classnames');
const TextareaAutosize = require('react-textarea-autosize');

const {paths, NOT_SET} = require('store/constants');
const {saveDeck} = require('store/decks');

const Preview = require('components/markdownpreview');

const DeckInfo = React.createClass({

    propTypes: {
        store: React.PropTypes.object.isRequired,
        deck: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        editingDeck: React.PropTypes.bool.isRequired
    },

    getInitialState() {

        const {deck} = this.props;

        return {
            preview: false,

            callback: this.saveDeck,
            domy: null,

            name: deck.get('name'),
            description: deck.get('description')
        };
    },

    onClickPreview(event) {
        event.preventDefault();
        event.stopPropagation();

        if(this.state.preview) {
            return;
        }

        this.setState({
            preview: true
        });
    },

    onClickWrite(event) {
        event.preventDefault();
        event.stopPropagation();

        if(!this.state.preview) {
            return;
        }

        this.setState({
            preview: false
        });
    },

    onChangeName(event) {
        this.setState({
            name: event.target.value
        });
    },

    onChangeDescription(event) {
        this.setState({
            description: event.target.value
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
    },

    setUpHandler(props) {

        const {editingDeck} = props;

        this.props.store.state().cursor(paths.dashboard.decks.finishEditing).update(() => {
            return editingDeck ? this.state.callback : NOT_SET;
        });

        const {deck} = props;

        if(this.props.editingDeck && !props.editingDeck) {

            this.setState({
                name: NOT_SET,
                description: NOT_SET
            });
            return;
        }

        if(!this.props.editingDeck && props.editingDeck) {

            this.setState({
                name: deck.get('name'),
                description: deck.get('description')
            });

            return;
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

        if(editingDeck && this.state.name !== NOT_SET && this.state.description !== NOT_SET) {

            const descriptionComponent = (function() {
                if(!this.state.preview) {
                    return (
                        <TextareaAutosize
                            useCacheForDOMMeasurements
                            minRows={6}
                            maxRows={30}
                            className="form-control"
                            id="deckDescription"
                            placeholder="Deck Description"
                            onChange={this.onChangeDescription}
                            value={this.state.description}
                        />
                    );
                }

                return (
                    <Preview text={this.state.description} />
                );
            }.call(this));

            return (
                <div key="editing">
                    <fieldset className="form-group">
                        <input type="text" className="form-control" id="deckName" placeholder="Deck Name" value={this.state.name} onChange={this.onChangeName} />
                    </fieldset>
                    <ul className="nav nav-tabs m-b">
                        <li className="nav-item">
                            <a
                                href={!this.state.preview ? '' : '#'}
                                className={classNames('nav-link', {active: !this.state.preview})}
                                onClick={this.onClickWrite}
                            >
                                {"Write"}
                            </a>
                        </li>
                        <li className="nav-item">
                            <a href={this.state.preview ? '' : '#'}
                            className={classNames('nav-link', {active: this.state.preview})}
                            onClick={this.onClickPreview}>{"Preview"}</a>
                        </li>
                    </ul>
                    <fieldset className="form-group">
                        {descriptionComponent}
                    </fieldset>
                </div>
            );
        }

        const {deck} = this.props;

        return (
            <div key="not-editing" className="m-b">
                <h4 className="card-title">{deck.get('name')}</h4>
                <p className="card-text">
                    <Preview text={deck.get('description')} />
                </p>
            </div>
        );
    }
});


module.exports = orwell(DeckInfo, {
    watchCursors(props, manual, context) {
        const state = context.store.state();

        return [
            state.cursor(paths.dashboard.decks.editing),
            state.cursor(paths.deck.self)
        ];
    },
    assignNewProps(props, context) {

        const store = context.store;
        const state = store.state();

        return {
            store: context.store,
            deck: state.cursor(paths.deck.self).deref(),
            editingDeck: state.cursor(paths.dashboard.decks.editing).deref()
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
