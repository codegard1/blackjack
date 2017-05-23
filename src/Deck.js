import React, { Component } from "react";

export class Deck extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: []
    };
  }

  componentWillMount() {
    var suits = ["Hearts", "Spades", "Clubs", "Diamonds"];
    var deck0 = suits.map(function(value, index) {
      return [
        { suit: value, pointValue: 1, title: "Ace" },
        { suit: value, pointValue: 1, title: "One" },
        { suit: value, pointValue: 1, title: "Two" },
        { suit: value, pointValue: 1, title: "Three" },
        { suit: value, pointValue: 1, title: "Four" },
        { suit: value, pointValue: 1, title: "Five" },
        { suit: value, pointValue: 1, title: "Six" },
        { suit: value, pointValue: 1, title: "Seven" },
        { suit: value, pointValue: 1, title: "Eight" },
        { suit: value, pointValue: 1, title: "Nine" },
        { suit: value, pointValue: 10, title: "Ten" },
        { suit: value, pointValue: 10, title: "Jack" },
        { suit: value, pointValue: 10, title: "Queen" },
        { suit: value, pointValue: 10, title: "King" }
      ];
    });
    var deck = [];
    deck0[0].forEach(function(item) {
      deck.push(item);
    });
    deck0[1].forEach(function(item) {
      deck.push(item);
    });
    deck0[2].forEach(function(item) {
      deck.push(item);
    });
    deck0[3].forEach(function(item) {
      deck.push(item);
    });
    this.setState({ cards: deck });
  }

  _shuffle() {
    var oldState = this.state;

    // var deck =
  }

  render() {
    var cardsArray = this.state.cards.map(function(card, index) {
      <Card
        key={index}
        suit={card.suit}
        title={card.title}
        pointValue={card.pointValue}
      />;
    });
    var divStyle = {
      display: "flex",
      "flex-direction": "row",
      padding: "2em",
      border: "1px solid salmon"
    };
    return <div style={divStyle}>{cardsArray}</div>;
  }
}

class Card extends Component {
  constructor(props) {
    super(props);
    this.state = {
      suit: "",
      title: "",
      pointValue: 0
    };
  }

  componentWillMount() {
    this.setState({
      suit: this.props.suit,
      title: this.props.title,
      pointValue: this.props.pointValue
    });
  }

  render() {
    var divStyle = {
      display: "inline-block",
      border: "1px solid black",
      padding: "1em"
    };
    return <div style={divStyle}>{this.props.title} of {this.props.suit}</div>;
  }
}
