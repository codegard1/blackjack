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
      gameStatus: undefined,
      dealer: {
        title: "Dealer",
        hand: [],
        handValue: undefined,
        status: "ok",
        turn: false
      },
      player1: {
        title: "Player1",
        hand: [],
        handValue: undefined,
        status: "ok",
        turn: false
      },
      currentPlayer: undefined
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
    this._evaluateHand = this._evaluateHand.bind(this);
    this._hit = this._hit.bind(this);
    this._stay = this._stay.bind(this);
  }

  componentWillMount() {
    const deck = Shuffle.shuffle();
    this.setState({ deck });
  }

  _shuffle() {
    const deck = this.state.deck;
    console.log("_shuffle new deck:", deck);
    deck.shuffle();
    this.setState({ deck });
  }

  _reset() {
    let deck = this.state.deck;
    deck.reset(); //sets the deck back to a full 52-card deck, unshuffled
    const drawn = [];
    const selected = [];
    let player1 = this.state.player1;
    player1.hand = [];
    player1.handValue = undefined;
    player1.status = undefined;
    this.setState({ deck, drawn, selected, player1 });
  }

  _draw(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.draw(1);
    drawn.push(ret);
    console.log("draw:", ret);
    this.setState({ deck, drawn });
  }

  _hit() {
    let deck = this.state.deck;
    let drawn = this.state.drawn;
    let player1 = this.state.player1;
    const ret = deck.draw(1);
    drawn.push(ret);
    player1.hand.push(ret);
    player1.handValue = this._evaluateHand(player1.hand);

    if (player1.handValue.aceAsOne > 21 && player1.handValue.aceAsTen > 21) {
      player1.status = "busted";
    }
    if (
      player1.handValue.aceAsOne === 21 || player1.handValue.aceAsTen === 21
    ) {
      player1.status = "blackjack";
    }

    this.setState({ deck, drawn, player1, currentPlayer: player1 });
  }

  _stay() {
    let deck = this.state.deck;
    let drawn = this.state.drawn;
    let player1 = this.state.player1;
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
    deck.push(cards);
    console.log("putOnTopOfDeck:", deck);
    this.setState({ deck });
  }

  _putOnBottomOfDeck(cards) {
    const deck = this.state.deck;
    deck.unshift(cards);
    console.log("putOnBottomOfDeck:", deck);
    this.setState({ deck });
  }

  _deal() {
    const deck = this.state.deck;
    let player1 = this.state.player1;
    const ret = deck.draw(2);
    player1.hand = ret;
    player1.turn = true;
    player1.handValue = this._evaluateHand(player1.hand);
    this.setState({
      deck,
      player1,
      gameStatus: "New",
      currentPlayer: player1
    });
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

  _evaluateHand(hand) {
    let handValue = {
      aceAsOne: 0,
      aceAsTen: 0
    };

    hand.forEach(card => {
      switch (card.sort) {
        case 14:
          handValue.aceAsOne += 1;
          handValue.aceAsTen += 11;
          break;

        case 13:
          handValue.aceAsOne += 10;
          handValue.aceAsTen += 10;
          break;

        case 12:
          handValue.aceAsOne += 10;
          handValue.aceAsTen += 10;
          break;

        case 11:
          handValue.aceAsOne += 10;
          handValue.aceAsTen += 10;
          break;

        default:
          handValue.aceAsOne += card.sort;
          handValue.aceAsTen += card.sort;
          break;
      }
    });

    console.log("hand value:", handValue);
    return handValue;
  }

  render() {
    return (
      <div id="Table">
        <div className="ms-Grid">

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">

              <DeckContainer
                deck={this.state.deck.cards}
                title="Deck"
                select={this._select}
                deselect={this._deselect}
                hidden={false}
              />

              <DeckContainer
                deck={this.state.player1.hand}
                title={this.state.player1.title}
                handValue={this.state.player1.handValue}
                select={this._select}
                deselect={this._deselect}
                hidden={false}
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
                hit={this._hit}
                stay={this._stay}
                gameStatus={this.state.gameStatus}
                currentPlayer={this.state.currentPlayer}
              />              
            </div>
          </div>

        </div>
      </div>
    );
  }
}

export default Table;
