import React, { Component } from "react";
import Shuffle from "shuffle";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";

export class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deck: undefined,
      drawn: [],
      selected: [],
      players: ["Player1"]
    };

    this._putOnBottomOfDeck = this._putOnBottomOfDeck.bind(this);
    this._putOnTopOfDeck = this._putOnTopOfDeck.bind(this);
    this._drawRandom = this._drawRandom.bind(this);
    this._drawFromBottomOfDeck = this._drawFromBottomOfDeck.bind(this);
    this._draw = this._draw.bind(this);
    this._reset = this._reset.bind(this);
    this._shuffle = this._shuffle.bind(this);
    this._deal = this._deal.bind(this);
    this._select = this._select.bind(this);
    this._deselect = this._deselect.bind(this);
  }

  componentWillMount() {
    const deck = Shuffle.shuffle();
    console.log("deck:", deck);
    this.setState({ deck });
  }

  _shuffle() {
    const deck = this.state.deck;
    console.log("_shuffle new deck:", deck);
    deck.shuffle();
    this.setState({ deck });
  }

  _reset() {
    const deck = this.state.deck;
    const drawn = [];
    deck.reset(); //sets the deck back to a full 52-card deck, unshuffled
    this.setState({ deck, drawn });
  }

  _draw(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.draw(1);
    drawn.push(ret);
    console.log("draw:", ret);
    this.setState({ deck, drawn });
  }

  _drawFromBottomOfDeck(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.drawFromBottomOfDeck(1);
    drawn.push(ret);
    console.log("drawFromBottomOfDeck:", ret);
    this.setState({ deck, drawn });
  }

  _drawRandom(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.drawRandom(1);
    drawn.push(ret);
    console.log("drawRandom:", ret);
    this.setState({ deck, drawn });
  }

  _putOnTopOfDeck(cards) {
    const deck = this.state.deck;
    console.log("putOnTopOfDeck:");
  }

  _putOnBottomOfDeck(cards) {
    const deck = this.state.deck;
    console.log("putOnBottomOfDeck:");
  }

  // this.deal = function(numberOfCards, arrayOfHands){
  //   for(var i = 0; i < numberOfCards; i++)
  //     for(var j = 0; j < arrayOfHands.length; j++)
  //       arrayOfHands[j].push(this.cards.pop());
  //   this.length = this.cards.length;
  // };

  _deal() {
    const deck = this.state.deck;
    const players = this.state.players;
    deck.deal(2, players);
    this.setState({ deck, players });
  }

  _select(card) {
    const selected = this.state.selected;
    selected.push(card);
    this.setState({ selected });
  }

  _deselect() {
    const selected = this.state.selected;
    this.setState({ selected });
  }

  render() {
    return (
      <div id="Table">
        <DeckContainer
          deck={this.state.deck.cards}
          title="Deck"
          select={this._select}
          deselect={this._deselect}
        />
        <DeckContainer
          deck={this.state.drawn}
          title="Drawn"
          select={this._select}
          deselect={this._deselect}
        />
        <ControlPanel
          shuffle={this._shuffle}
          putOnBottomOfDeck={this._putOnBottomOfDeck}
          putOnTopOfDeck={this._putOnTopOfDeck}
          drawRandom={this._drawRandom}
          drawFromBottomOfDeck={this._drawFromBottomOfDeck}
          draw={this._draw}
          reset={this._reset}
          deal={this._deal}
        />
      </div>
    );
  }
}

export default Table;
