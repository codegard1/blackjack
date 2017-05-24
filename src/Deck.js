import React, { Component } from "react";
import Masonry from "react-masonry-component";

import { Card } from "./Card";

class Gallery extends Component {
  render() {
    const masonryOptions = {
      transitionDuration: 10,
    };

    const childElements = this.props.elements.map(function(element, index) {
      return (
        <li className="image-element-class">
          <Card suitClass={element.suitClass} key={index} {...element} />
        </li>
      );
    });

    return (
      <Masonry
        className={"deck"} // default ''
        elementType={"ul"} // default 'div'
        options={masonryOptions} // default {}
        disableImagesLoaded={false} // default false
        updateOnEachImageLoad={false} // default false and works only if disableImagesLoaded is false
      >
        {childElements}
      </Masonry>
    );
  }
}

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
        { suit: value, pointValue: 1, i: "A", title: "Ace" },
        { suit: value, pointValue: 1, i: "2", title: "Two" },
        { suit: value, pointValue: 1, i: "3", title: "Three" },
        { suit: value, pointValue: 1, i: "4", title: "Four" },
        { suit: value, pointValue: 1, i: "5", title: "Five" },
        { suit: value, pointValue: 1, i: "6", title: "Six" },
        { suit: value, pointValue: 1, i: "7", title: "Seven" },
        { suit: value, pointValue: 1, i: "8", title: "Eight" },
        { suit: value, pointValue: 1, i: "9", title: "Nine" },
        { suit: value, pointValue: 10, i: "10", title: "Ten" },
        { suit: value, pointValue: 10, i: "J", title: "Jack" },
        { suit: value, pointValue: 10, i: "Q", title: "Queen" },
        { suit: value, pointValue: 10, i: "K", title: "King" }
      ];
    });
    var deck = [];
    // Hearts
    deck0[0].forEach(item => {
      item.suitClass = item.suit.toLowerCase();
      deck.push(item);
    });
    // Spades
    deck0[1].forEach(item => {
      item.suitClass = item.suit.toLowerCase();
      deck.push(item);
    });
    // Clubs
    deck0[2].forEach(item => {
      item.suitClass = item.suit.toLowerCase();
      deck.push(item);
    });
    // Diamonds
    deck0[3].forEach(item => {
      item.suitClass = item.suit.toLowerCase();
      deck.push(item);
    });
    this.setState({ cards: deck });
  }

  // _shuffle() {
  //   var oldState = this.state;
  // }

  render() {
    const cardsArray = this.state.cards.map(function(card, index) {
      return <Card suitClass={card.suitClass} key={index} {...card} />;
    });

    return (
      <div id="DeckContainer">
        {/*{cardsArray}*/}
        <Gallery elements={this.state.cards} />
      </div>
    );
  }
}
