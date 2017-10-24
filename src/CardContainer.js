import React from "react";
import * as T from "prop-types";

import BaseComponent from "./BaseComponent";
import "./CardContainer.css";

class CardContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = { isSelected: false };

    /* bind private methods */
    this._bind('_toggleSelect');
  }

  static propTypes = {
    description: T.string.isRequired,
    deselect: T.func,
    isBackFacing: T.bool,
    isSelectable: T.bool,
    isDescVisible: T.bool,
    select: T.func,
    sort: T.number.isRequired,
    suit: T.string.isRequired,
  };

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
    const description = this.props.description + " of " + this.props.suit + "s";
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
    cardClass += this.props.isSelectable ? "selectable " : "unselectable";
    cardClass += this.state.isSelected ? " selected " : "";
    cardClass += this.props.isBackFacing ? " backfacing" : "";

    return (
      <div
        className={cardClass}
        onClick={this.props.isSelectable && this._toggleSelect}
      >
        <span className="ms-font-xl card-title top">{cardTitle}</span>
        {this.props.isDescVisible && <p className="ms-font-m" data-p={description} />}
        <span className="ms-font-xl card-title bottom">{cardTitle}</span>
        {this.props.isBackFacing && <div className="card-back" />}
      </div>
    );
  }
}

export default CardContainer;
