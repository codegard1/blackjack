import React, { Component } from "react";
import * as T from "prop-types";

// &spades;	&hearts;	&diams;	&clubs;

export class CardContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { selected: false };

    this._toggleSelect = this._toggleSelect.bind(this);
  }

  _toggleSelect() {
    if (this.state.selected === false) {
      this.props.select(this);
      this.setState({ selected: true });
    }
    if (this.state.selected === true) {
      this.props.select(this);
      this.setState({ selected: false});
    }
  }

  render() {
    const selectedClass = this.state.selected ? " selected " : "";
    const short = this.props.toString();
    const suitClass = this.props.suit.toLowerCase() + "s";
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
        cardTitle = this.props.sort + " ";
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
    return (
      <div
        className={"card " + suitClass + selectedClass}
        onClick={this._toggleSelect}
      >
        <span className="ms-font-xl card-title top">{cardTitle}</span>
        <p className="ms-font-m" data-p={short}>
          
        </p>
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
