const React = require('react');
const Immutable = require('immutable');
const orwell = require('orwell');

const {flow} = require('store/utils');
const {toStashProfile} = require('store/route');
const {setStash} = require('store/stashes');
const {applyStashCardsPageArgs} = require('store/cards');

const changeToStash = flow(

    // stashes
    setStash,

    // route
    applyStashCardsPageArgs,
    toStashProfile
);

const StashChild = React.createClass({

    propTypes: {
        stash: React.PropTypes.instanceOf(Immutable.Map).isRequired,
        store: React.PropTypes.object.isRequired
    },

    onClickStash(event) {
        event.preventDefault();
        event.stopPropagation();

        const {stash, store} = this.props;
        store.invoke(changeToStash, {stash, stashID: stash.get('id')});
    },

    generateSummary() {
        return 'summary TBA';
    },

    render() {

        const {stash} = this.props;
        const name = stash.get('name');

        return (
            <div className="list-group-item carditem">
                <h4 className="list-group-item-heading"><a href="#" onClick={this.onClickStash}>{name}</a></h4>
                {this.generateSummary()}
            </div>
        );
    }
});

module.exports = orwell(StashChild, {
    watchCursors(props) {

        const {childCursor} = props;

        return childCursor;
    },
    assignNewProps(props, context) {

        const {childCursor} = props;

        const stash = childCursor.deref();

        return {
            stash: stash,
            store: context.store
        };
    }
}).inject({
    contextTypes: {
        store: React.PropTypes.object.isRequired
    }
});
