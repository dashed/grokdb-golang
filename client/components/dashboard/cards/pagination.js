const React = require('react');

const CardsPagination = React.createClass({
    render() {
        return (
            <nav style={{'textAlign': 'center'}}>
                <ul className="pagination">
                    <li className="disabled">
                        <a href="#" aria-label="Previous">
                            <span aria-hidden="true">Previous</span>
                            <span className="sr-only">Previous</span>
                        </a>
                    </li>
                    <li><a href="#">1</a></li>
                    <li><a href="#">2</a></li>
                    <li><a href="#">3</a></li>
                    <li><a href="#">4</a></li>
                    <li><a href="#">5</a></li>
                    <li>
                        <a href="#" aria-label="Next">
                            <span aria-hidden="true">Next</span>
                            <span className="sr-only">Next</span>
                        </a>
                    </li>
                </ul>
            </nav>
        );
    }
});

module.exports = CardsPagination;
