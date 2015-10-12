const {
    graphql,
    GraphQLSchema,
    GraphQLObjectType
} = require('graphql');

const {
    deckField,
    deckListField
} = require('./deck');

// const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//         name: 'Query',
//         fields: {
//             deck: deckField
//         }
//     })
// });

// const query = `
//     query HelloQuery {
//         deck(id: 1) {
//             name
//         }
//     }
// `;

const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            deck: deckField,
            // deckList: deckListField
        }
    })
});

const query = `
    query HelloQuery {
        lol: deck(id: 2),
        lol2: deck(id: 1)
    }
`;

graphql(schema, query).then((result) => {
    console.log('result', result.data.deck.deref());
});
