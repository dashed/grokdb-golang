const React = require('react');
const orwell = require('orwell');

const Component = React.createClass({
    render() {
        return (
            <div>
                <div className="row">
                    <div className="col-sm-12">
                        <ol className="breadcrumb">
                            <li><a href="#">Home</a></li>
                            <li><a href="#">Library</a></li>
                            <li className="active">Data</li>
                        </ol>
                    </div>
                </div>
                <div className="row">
                    <div className="col-sm-12">
                        {"decks 2"}
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = orwell(Component, {
    watchCursors(/*props*/) {
        return [];
    },
    assignNewProps(/*props*/) {
        return {
            deck: null
        };
    }
});

