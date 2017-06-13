import React, { Component } from "react";
import * as T from "prop-types";

import './CardContainer.css';

export class CardContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { isSelected: false };

    this._toggleSelect = this._toggleSelect.bind(this);
  }

  _toggleSelect() {
    const cardAttributes = {
      description: this.props.description,
      suit: this.props.suit,
      sort: this.props.sort
    };
    if (this.state.isSelected === false) {
      this.props.select(cardAttributes);
      this.setState({ isSelected: true });
    }
    if (this.state.isSelected === true) {
      this.props.deselect(cardAttributes);
      this.setState({ isSelected: false });
    }
  }

  render() {
    const short = this.props.toString();
    let cardTitle = "";
    switch (this.props.sort) {
      case 14:
        cardTitle = "A ";
        break;

      case 13:
        cardTitle = "K ";
        break;

      case 12:
        cardTitle = "Q ";
        break;

      case 11:
        cardTitle = "J ";
        break;

      default:
        cardTitle = this.props.sort;
        break;
    }

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

      default:
        break;
    }

    let cardClass = "card ";
    cardClass += this.props.suit.toLowerCase() + "s ";
    cardClass += this.state.isSelected ? " selected " : "";
    cardClass += this.props.isSelectable ? "selectable " : "unselectable";

    return (
      <div
        className={cardClass}
        onClick={this.props.isSelectable && this._toggleSelect}
      >
        <span className="ms-font-xl card-title top">{cardTitle}</span>
        <p className="ms-font-m" data-p={short} />
        <span className="ms-font-xl card-title bottom">{cardTitle}</span>
      </div>
    );
  }
}

CardContainer.propTypes = {
  description: T.string.isRequired,
  sort: T.number.isRequired,
  suit: T.string.isRequired,
  toShortDisplayString: T.func,
  select: T.func,
  deselect: T.func
};

export default CardContainer;
