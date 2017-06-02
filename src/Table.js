import React, { Component } from "react";
import Shuffle from "shuffle";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";
import { Fabric } from "office-ui-fabric-react/lib/Fabric";

export class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deck: undefined,
      drawn: [],
      selected: [],
      player1: []
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
    const player1 = [];
    deck.reset(); //sets the deck back to a full 52-card deck, unshuffled
    this.setState({ deck, drawn, player1 });
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
    console.log("deal!");
    const deck = this.state.deck;
    let player1 = this.state.player1;
    const ret = deck.draw(2);
    player1 = ret;
    console.log("post-deal deck:", deck);
    console.log("post-deal player1", player1);
    this.setState({ deck, player1 });
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
      <Fabric>
        <div className="ms-Grid">

          <div id="Table">
            
            <div className="ms-Grid-row">
              <div className="ms-Grid-col ms-u-sm612">
                <DeckContainer
                  deck={this.state.deck.cards}
                  title="Deck"
                  select={this._select}
                  deselect={this._deselect}
                />
              </div>
            </div>

            <div className="ms-Grid-row">
              <div className="ms-Grid-col ms-u-sm12">
                <DeckContainer
                  deck={this.state.player1}
                  title="player1"
                  select={this._select}
                  deselect={this._deselect}
                />
              </div>
            </div>

            <div className="ms-Grid-row">
              <div className="ms-Grid-col ms-u-sm12">
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
            </div>

          </div>
        </div>

      </Fabric>
    );
  }
}

export default Table;
