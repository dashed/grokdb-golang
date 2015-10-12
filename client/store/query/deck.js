const Immutable = require('immutable');
const co = require('co');
const minitrue = require('minitrue');
const DataLoader = require('dataloader');
const {
    GraphQLScalarType,
    GraphQLObjectType,
    GraphQLList,
    GraphQLString,
    GraphQLInt
} = require('graphql');

const deckData = {
    1: {
        id: 1,
        name: 'Library',
        description: 'root library',
        children: [2, 4]
    },
    2: {
        id: 2,
        name: 'c09',
        description: 'c09',
        children: [3]
    },
    3: {
        id: 3,
        name: 'web',
        description: 'web',
        children: []
    },
    4: {
        id: 4,
        name: 'd27',
        description: 'd27',
        children: []
    },
};

/* loader */

const deckLoader = new DataLoader(function(keys) {
    console.log(keys);
    return Promise.resolve(keys.map(function(id) {
        return deckData[id];
    }));
});

const NOT_SET = {};
const deckLookUpTable = minitrue({});

const deckCursor = co.wrap(function*(id) {

    const cursor = deckLookUpTable.cursor(id);
    const maybeDeck = cursor.deref(NOT_SET);

    if(maybeDeck === NOT_SET) {

        const deck = yield deckLoader.load(id);

        cursor.update(() => Immutable.fromJS(deck));
    }

    return cursor;
});

/* types */

// const DeckType = new GraphQLObjectType({
//     name: 'Deck',
//     fields: () => ({

//         id: {
//             type: GraphQLInt,
//             description: 'The id of the deck.',
//         },

//         name: {
//             type: GraphQLString,
//             description: 'The name of the deck.',
//             resolve: (deck) => {
//                 return deck.deref().name;
//             }
//         },

//         description: {
//             type: GraphQLString,
//             description: 'The description of the deck.',
//         },

//         children: {
//             type: new GraphQLList(DeckType),
//             description: `This deck's children.`,
//             resolve: (deck) => {
//                 return deck.children.map(id => deckData[id]);
//             }
//         }
//     })
// });

// const DeckListType = new GraphQLList(DeckType);

/* fields of type GraphQLFieldConfig */

var CursorType = new GraphQLScalarType({
    name: 'Cursor',
    serialize: (value) => {
        // TODO: ensure is Probe type
        return value;
    }
});

const deckField = {
    type: CursorType,
    // type: DeckType,
    args: {
        id: { type: GraphQLInt }
    },
    resolve(root, args) {
        return deckCursor(args.id);
    }
};

const deckListField = {
    type: new GraphQLList(CursorType),
    args: {
        parentDeckID: { type: GraphQLInt }
    },
    resolve(root, args) {
        return [{
            id: args.parentDeckID,
            name: 'Library',
            description: 'this is a description'
        }];
    }
};

module.exports = {
    // types
    // DeckType,
    // DeckListType,

    // fields
    deckField,
    deckListField
};
