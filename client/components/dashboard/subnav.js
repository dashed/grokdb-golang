const React = require('react');
const orwell = require('orwell');

const SubNav = React.createClass({
    render() {
        return (
            <div className="row">
                <div className="col-sm-6">
                    <div className="btn-group p-b pull-left" role="group" aria-label="Basic example">
                      <button type="button" className="btn btn-primary">Decks</button>
                      <button type="button" className="btn btn-secondary">Cards</button>
                    </div>
                </div>
                <div className="col-sm-6">
                    <div className="btn-group p-b pull-right" role="group" aria-label="Basic example">
                      <button type="button" className="btn btn-secondary">Quizzes</button>
                      <button type="button" className="btn btn-secondary">Labels</button>
                      <button type="button" className="btn btn-secondary">Settings</button>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(SubNav, {});
