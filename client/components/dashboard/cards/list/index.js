const React = require('react');
const Immutable = require('immutable');
const {Probe} = require('minitrue');

const {NOT_SET} = require('store/constants');

const CardsChildren = require('./children');
const SortDropdown = require('./dropdown');

// structure of localstate
const DEFAULTS = {

    noCardsString: 'No cards to display. To get started, you should create your first card for this deck.',

    list: Immutable.List,
    breadcrumb: Immutable.List,

    currentPage: 1,
    sort: 'reviewed_at',
    order: 'DESC',

    // routes
    changeToCard: NOT_SET,
    afterCardsListSort: NOT_SET, // route to execute on cards list sort
    afterCardsListPageChange: NOT_SET, // unused
    afterCardsListDeckChange: NOT_SET,
    afterCardsListSearch: NOT_SET // TODO: to be implemented // unused
};
const overrides = Immutable.fromJS(DEFAULTS);

const CardsList = React.createClass({

    propTypes: {
        localstate: React.PropTypes.instanceOf(Probe).isRequired
    },

    componentWillMount() {

        const {localstate} = this.props;

        localstate.update(Immutable.Map(), function(map) {
            return overrides.mergeDeep(map);
        });
    },

    render() {

        const {localstate} = this.props;

        return (
            <div key="list">
                <div className="row">
                    <div className="col-sm-12 m-y">
                        <div className="card m-y-0">
                            <div className="card-block p-a clearfix">
                                <div className="row">
                                    <div className="col-sm-4">
                                        <input type="text" className="form-control form-control-sm" placeholder="Search" />
                                    </div>
                                    <div className="col-sm-8">
                                        <SortDropdown
                                            localstate={localstate}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        <CardsChildren
                            localstate={localstate}
                        />
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = CardsList;
