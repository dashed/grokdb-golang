const React = require('react');
const orwell = require('orwell');

const Breadcrumb = React.createClass({
    render() {
        return (
            <ol className="breadcrumb">
                <li><a href="#">{" "}</a></li>
                <li><a href="#">Library</a></li>
                <li className="active">Data</li>
                <li className="active">{" "}</li>
            </ol>
        );
    }
});

module.exports = orwell(Breadcrumb, {});
