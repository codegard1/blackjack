import React, { Component } from "react";
import * as T from "prop-types";

// &spades;	&hearts;	&diams;	&clubs;

export class CardContainer extends Component {
  render() {
    const suitClass = this.props.suit.toLowerCase() + "s";
    let suitIcon = "";
    switch (this.props.suit) {
      case "Heart":
        suitIcon = "&hearts;";
        break;

      case "Heart":
        suitIcon = "&hearts;";
        break;

      case "Heart":
        suitIcon = "&hearts;";
        break;

      case "Heart":
        suitIcon = "&hearts;";
        break;

      default:
        suitIcon = "&hearts;";
    }
    return (
      <div className={"card " + suitClass}>
        <span>{suitIcon}</span>
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
