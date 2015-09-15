const React = require('react');
// const orwell = require('orwell');
// const either = require('react-either');

// const {NOT_SET, paths} = require('store/constants');

const CardChild = require('./child');

const CardsChildren = React.createClass({
    render() {
        return (
            <div className="card m-t">
                <div className="card-block">
                    {"card header here with some dropdowns"}
                </div>
                <ul className="list-group">
                    <li className="list-group-item" key={1}>
                        <CardChild />
                    </li>
                </ul>
            </div>
        );
    }
});

module.exports = CardsChildren;
