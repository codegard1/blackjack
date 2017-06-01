import React, { Component } from "react";
import * as T from "prop-types";

export class CardContainer extends Component {
  render() {
    const suitClass = (this.props.suit.toLowerCase() + 's');
    return (
      <div className={"card " + suitClass}>
        <p>{this.props.description} of {this.props.suit}</p>
      </div>
    );
  }
}

CardContainer.propTypes = {
  description: T.string.isRequired,
  sort: T.number.isRequired,
  suit: T.string.isRequired
};

export default CardContainer;
