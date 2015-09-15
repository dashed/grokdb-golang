const superhot = require('store/superhot');
const {paths} = require('store/constants');

const transforms = {
    createNewCard(state, cardProps) {

        // get deck id
        const deck = state.cursor(paths.deck.self).deref();

        const marshalledSides = JSON.stringify(cardProps.sides);

        // TODO: optimistic update

        superhot
            .post(`/cards`)
            .type('json')
            .send({
                title: cardProps.title,
                description: cardProps.description,
                sides: marshalledSides,
                deck: deck.get('id')
            })
            .end();

        // go to card list
    }
};

module.exports = transforms;
