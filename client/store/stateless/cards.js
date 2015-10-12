/*global localforage: true */
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const superhot = require('store/superhot');
const {filterInt} = require('store/utils');

const __parsePageNum = function(localstateKeyword) {
    return co.wrap(function*(deckID = 0, pageNum = 1) {

        pageNum = filterInt(pageNum);

        if(_.isNaN(pageNum) || !_.isNumber(pageNum)) {
            const obj = yield localforage.getItem(localstateKeyword);

            if(!_.isPlainObject(obj)) {
                pageNum = 1;
            } else {
                pageNum = obj.pageNum;
                const __deckID = obj.deckID;

                if(__deckID != deckID || deckID == 0) {
                    pageNum = 1;
                }
            }
        }

        if(_.isNaN(pageNum) || !_.isNumber(pageNum)) {
            pageNum = 1;
        }

        pageNum = pageNum <= 0 ? 1 : pageNum;

        yield localforage.setItem(localstateKeyword, {pageNum, deckID});

        return pageNum;
    });
};

const transforms = {

    fetchCard(inputs) {

        const {cardID} = inputs;

        // fetch card
        return new Promise(function(resolve, reject) {
            superhot
                .get(`/cards/${cardID}`)
                .end(function(err, res){
                    switch(res.status) {
                    case 404:
                        return reject(err);
                        break;
                    case 200:
                        return resolve({
                            card: Immutable.fromJS(res.body),
                            cardID: res.body.id
                        });
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }

                    // TODO: error handling
                    resolve({err: err, response: res});
                });
        });
    },

    saveCard(inputs) {
        const {patchCard, cardID} = inputs;


        // save card
        return new Promise(function(resolve, reject) {
            superhot
                .patch(`/cards/${cardID}`)
                .send(patchCard)
                .end(function(err, res){

                    switch(res.status) {
                    case 404:
                        return reject(err);
                        break;
                    case 200:
                        return resolve({
                            card: Immutable.fromJS(res.body),
                            cardID: res.body.id
                        });
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }

                    // TODO: error handling
                    resolve({err: err, response: res});
                });
        });
    },

    parseDeckCardsPageNum: __parsePageNum('deckcardspage'),
    parseStashCardsPageNum: __parsePageNum('stashcardspage'),

    parseOrder: co.wrap(function*(pageOrder = 'DESC'){

        if(!_.isString(pageOrder) || pageOrder.length <= 0) {
            pageOrder = yield localforage.getItem('order');
        }

        if(!_.isString(pageOrder) || pageOrder.length <= 0) {
            pageOrder = 'DESC';
        }

        pageOrder = pageOrder.toUpperCase();

        switch(pageOrder) {
        case 'DESC':
        case 'ASC':
            break;
        default:
            pageOrder = 'DESC';
        }

        yield localforage.setItem('order', pageOrder);

        return pageOrder;
    }),

    parseSort: co.wrap(function*(pageSort){

        if(!_.isString(pageSort) || pageSort.length <= 0) {
            pageSort = yield localforage.getItem('sort');
        }

        if(!_.isString(pageSort) || pageSort.length <= 0) {
            pageSort = 'reviewed_at';
        }

        pageSort = pageSort.toLowerCase();

        switch(pageSort) {
        case 'created_at':
        case 'updated_at':
        case 'title':
        case 'reviewed_at':
        case 'times_reviewed':
            break;
        default:
            pageSort = 'reviewed_at';
        }

        yield localforage.setItem('sort', pageSort);

        return pageSort;
    }),

    parseNumOfPages: co.wrap(function*(numOfPages = 1) {

        numOfPages = filterInt(numOfPages);

        if(_.isNaN(numOfPages) || !_.isNumber(numOfPages)) {
            numOfPages = 1;
        }

        numOfPages = numOfPages <= 0 ? 1 : numOfPages;

        return numOfPages;
    }),

    fetchCardsCount(options) {

        const {deckID} = options;

        // get total count
        return new Promise(function(resolve) {
            superhot
                .get(`/decks/${deckID}/cards/count`)
                .end(function(err, res){

                    const count = filterInt(res.body && res.body.total || 0);

                    resolve({cardsCount: count});
                });
        });
    },

    fetchCardsList(options) {
        // TODO: move this constant
        const perPage = 25;

        const {deckID, pageNum, pageSort, pageOrder} = options;

        return new Promise(function(resolve, reject) {
            superhot
                .get(`/decks/${deckID}/cards`)
                .query({ 'page': pageNum })
                .query({ 'per_page': perPage })
                .query({ 'sort': pageSort })
                .query({ 'order': pageOrder })
                .end(function(err, res){

                    switch(res.status) {
                    case 404:
                        resolve({cardsList: Immutable.List()});
                        break;
                    case 200:
                        resolve({cardsList: Immutable.fromJS(res.body)});
                        break;
                    default:
                        return reject(Error('http code not found'));
                        // TODO: error handling
                    }

                });
        });
    }
};

module.exports = transforms;
