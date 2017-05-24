import React, { Component } from "react";
import PropTypes from "proptypes";

export class Card extends Component {
  render() {
    const suitClass = this.props.suitClass;
    return (
      <div className={"card " + suitClass}>
        <p>{this.props.title} of {this.props.suit}</p>
      </div>
    );
  }
}

Card.propTypes = {
  title: PropTypes.string.isRequired,
  suit: PropTypes.string.isRequired
};
