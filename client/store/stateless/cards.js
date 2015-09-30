/*global localforage: true */
const co = require('co');
const _ = require('lodash');
const Immutable = require('immutable');

const superhot = require('store/superhot');
const {filterInt} = require('store/utils');

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

    fetchPageNum: co.wrap(function*(pageNum = 1) {

        pageNum = filterInt(pageNum);

        if(_.isNaN(pageNum) || !_.isNumber(pageNum)) {
            pageNum = yield localforage.getItem('page');
        }

        if(_.isNaN(pageNum) || !_.isNumber(pageNum)) {
            pageNum = 1;
        }

        pageNum = pageNum <= 0 ? 1 : pageNum;

        yield localforage.setItem('page', pageNum);

        return pageNum;
    }),

    fetchOrder: co.wrap(function*(pageOrder = 'DESC'){

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

    fetchSort: co.wrap(function*(pageSort = 'reviewed_at'){

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

    fetchCardsCount(options) {

        const {deckID, pageNum} = options;

        // get total count
        return new Promise(function(resolve) {
            superhot
                .get(`/decks/${deckID}/cards/count`)
                .query({ 'page': pageNum })
                .end(function(err, res){
                    resolve({cardsCount: res.body && res.body.total || 0});
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
