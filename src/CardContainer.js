import React, { Component } from "react";
import * as T from "prop-types";

// &spades;	&hearts;	&diams;	&clubs;

export class CardContainer extends Component {
  render() {
    const suitClass = this.props.suit.toLowerCase() + "s";
    let cardTitle = this.props.sort + " ";
    switch (this.props.suit) {
      case "Heart":
        cardTitle += "\u2665";
        break;

      case "Spade":
        cardTitle += "\u2660";
        break;

      case "Diamond":
        cardTitle += "\u2666";
        break;

      case "Club":
        cardTitle += "\u2663";
        break;
    }
    return (
      <div className={"card " + suitClass}>
        <span className="ms-font-xl card-title">{cardTitle}</span>
        <p className="ms-font-m">{this.props.description} of {this.props.suit + 's'}</p>
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
