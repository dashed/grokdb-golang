const React = require('react');
const {Probe} = require('minitrue');
const orwell = require('orwell');
const classNames = require('classnames');

const {difficulty} = require('store/constants');

const ReviewControls = React.createClass({

    propTypes: {
        revealCard: React.PropTypes.bool.isRequired,
        localstate: React.PropTypes.instanceOf(Probe).isRequired,

        // TODO: move this out into some utils module
        currentDifficulty: function(props, propName) {
            return typeof props[propName] === 'symbol';
        }
    },

    onClickRevealCard(event) {
        event.preventDefault();
        event.stopPropagation();

        const {localstate} = this.props;
        localstate.update(function(map) {
            return map.set('revealCard', true).set('showBackSide', true);
        });
    },

    onClickSkip(event) {
        event.preventDefault();
        event.stopPropagation();
    },

    onClickDifficulty(_difficulty) {

        const {localstate} = this.props;

        return function(event) {
            event.preventDefault();
            event.stopPropagation();

            localstate.cursor('difficulty').update(function() {
                return _difficulty;
            });
        };
    },

    render() {

        if(!this.props.revealCard) {

            return (
                <div key="showbackbutton" className="row">
                    <div className="col-sm-6">
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={this.onClickRevealCard}>
                            {"Show Back Side"}
                        </button>
                    </div>
                    <div className="col-sm-6">
                        <button type="button" className="btn btn-info btn-lg btn-block" onClick={this.onClickSkip}>
                            {"Skip Card"}
                        </button>
                    </div>
                </div>

            );
        }

        const {currentDifficulty} = this.props;

        return (
            <div key="difficulty" className="row">
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button
                            style={{width: '33.33%'}}
                            type="button"
                            className={classNames(
                                'btn',
                                {
                                    'btn-danger-outline': currentDifficulty != difficulty.forgot,
                                    'btn-danger': currentDifficulty === difficulty.forgot
                                })
                            }
                            onClick={this.onClickDifficulty(difficulty.forgot)}>
                            {"Forgot"}
                        </button>
                        <button
                            style={{width: '33.33%'}}
                            type="button"
                            className={classNames(
                                'btn',
                                {
                                    'btn-danger-outline': currentDifficulty != difficulty.hard,
                                    'btn-danger': currentDifficulty === difficulty.hard
                                })
                            }
                            onClick={this.onClickDifficulty(difficulty.hard)}>
                            {"Hard"}
                        </button>
                        <button
                            style={{width: '33.33%'}}
                            type="button"
                            className={classNames(
                                'btn',
                                {
                                    'btn-danger-outline': currentDifficulty != difficulty.fail,
                                    'btn-danger': currentDifficulty === difficulty.fail
                                })
                            }
                            onClick={this.onClickDifficulty(difficulty.fail)}>
                            {"Fail"}
                        </button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button
                            style={{width: '50%'}}
                            type="button"
                            className={classNames(
                                'btn',
                                {
                                    'btn-success-outline': currentDifficulty != difficulty.good,
                                    'btn-success': currentDifficulty === difficulty.good
                                })
                            }
                            onClick={this.onClickDifficulty(difficulty.good)}>
                            {"Good"}
                        </button>
                        <button
                            style={{width: '50%'}}
                            type="button"
                            className={classNames(
                                'btn',
                                {
                                    'btn-success-outline': currentDifficulty != difficulty.easy,
                                    'btn-success': currentDifficulty === difficulty.easy
                                })
                            }
                            onClick={this.onClickDifficulty(difficulty.easy)}>
                            {"Easy"}
                        </button>
                    </div>
                </div>
                <div className="col-sm-4">
                    <div style={{width: '100%'}} className="btn-group btn-group-lg" role="group" aria-label="Basic example">
                        <button style={{width: '70%'}} type="button" className="btn btn-info-outline">{"Next"}</button>
                        <button style={{width: '30%'}} type="button" className="btn btn-info-outline">{"Skip"}</button>
                    </div>
                </div>
            </div>
        );

    }
});

module.exports = orwell(ReviewControls, {
    watchCursors(props) {
        const {localstate} = props;

        return [
            localstate.cursor('revealCard'),
            localstate.cursor('difficulty')
        ];
    },
    assignNewProps(props) {
        const {localstate} = props;

        return {
            revealCard: localstate.cursor('revealCard').deref(false),
            currentDifficulty: localstate.cursor('difficulty').deref()
        };
    }
});
