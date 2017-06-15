import React, { Component } from "react";
import Shuffle from "shuffle";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";
import Player from "./Player";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";
import { Fabric } from "office-ui-fabric-react/lib/Fabric";

const PlayingCard = require("shuffle/lib/playingCard");

export class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deck: [],
      drawn: [],
      selected: [],
      gameStatus: 0,
      players: [
        {
          title: "Dealer",
          hand: [],
          handValue: 0,
          status: "ok",
          turn: false
        }
      ],
      currentPlayer: 1,
      turnCount: 0,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
      isMessageBarVisible: false,
      isDeckVisible: true,
      isDrawnVisible: false,
      isSelectedVisible: false
    };
    //Deck Methods
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
    // ControlPanel methods
    this._hit = this._hit.bind(this);
    this._stay = this._stay.bind(this);
    this._removeSelectedFromPlayerHand = this._removeSelectedFromPlayerHand.bind(
      this
    );
    this._removeSelectedFromDrawn = this._removeSelectedFromDrawn.bind(this);
    this._newPlayer = this._newPlayer.bind(this);
    this._clearHand = this._clearHand.bind(this);
    this._resetGame = this._resetGame.bind(this);
    this._showMessageBar = this._showMessageBar.bind(this);
    this._toggleDeckVisibility = this._toggleDeckVisibility.bind(this);
    this._toggleDrawnVisibility = this._toggleDrawnVisibility.bind(this);
    this._toggleSelectedVisibility = this._toggleSelectedVisibility.bind(this);
    //Game Status Methods
    this._evaluateHand = this._evaluateHand.bind(this);
    this._evaluateGame = this._evaluateGame.bind(this);
  }

  componentWillMount() {
    this._newDeck();
    this._newPlayer("Chris");
  }

  _newDeck() {
    const deck = Shuffle.shuffle();
    this.setState({ deck });
  }

  _newPlayer(title) {
    let players = this.state.players;
    const newPlayer = {
      title: title,
      hand: [],
      handValue: 0,
      status: "ok",
      turn: false
    };
    players.push(newPlayer);
    this.setState({ players });
  }

  _clearHand(index) {
    const players = this.state.players;
    players[index].hand = [];
    players[index].handValue = undefined;
    players[index].status = undefined;
    this.setState({ players });
  }

  _shuffle() {
    const deck = this.state.deck;
    deck.shuffle();
    this.setState({ deck });
  }

  _resetGame() {
    this._newDeck();
    this._clearHand(this.state.currentPlayer);
    this.setState({ drawn: [], selected: [], gameStatus: 0 });
    this._showMessageBar("Game reset", MessageBarType.info);
  }

  _reset() {
    const deck = this.state.deck;
    deck.reset(); //sets the deck back to a full 52-card deck, unshuffled
    this.setState({ deck });
  }

  _draw(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.draw(1);
    drawn.push(ret);
    this.setState({ deck, drawn });
  }

  _deal() {
    const deck = this.state.deck;
    let players = this.state.players;
    let currentPlayer = players[this.state.currentPlayer];

    currentPlayer.turn = true;
    currentPlayer.hand = deck.draw(2);
    currentPlayer.handValue = this._evaluateHand(currentPlayer.hand);
    players[this.state.currentPlayer] = currentPlayer;

    this.setState(
      {
        deck,
        players
      },
      this._evaluateGame(1)
    );
  }

  _hit() {
    let deck = this.state.deck;
    let drawn = this.state.drawn;
    let players = this.state.players;
    let currentPlayer = players[this.state.currentPlayer];
    const ret = deck.draw(1);
    drawn.push(ret);
    currentPlayer.hand.push(ret);
    currentPlayer.handValue = this._evaluateHand(currentPlayer.hand);

    this.setState({ deck, drawn, players }, this._evaluateGame);
  }

  _stay() {
    let deck = this.state.deck;
    let drawn = this.state.drawn;
    let players = this.state.players;
    let currentPlayer = players[this.state.currentPlayer];

    this._evaluateGame(6);
  }

  _evaluateGame(nextGameStatus = this.state.gameStatus) {
    // set gameStatus from somewhere other than state
    let gameStatus = nextGameStatus;
    let players = this.state.players;
    let currentPlayer = players[this.state.currentPlayer];
    let nextPlayer = -1;
    const busted = "busted";
    const blackjack = "blackjack";
    const winner = "winner";

    console.log("gamestatus", gameStatus);

    switch (gameStatus) {
      case 0: //Off
        this._showMessageBar("Hello", MessageBarType.info);
        break;

      case 1: // New Game
        this._showMessageBar("Game in progress", MessageBarType.info);
        // determine if any hands are busted
        let bustedHands = [];
        players.forEach((player, index) => {
          if (
            player.handValue.aceAsOne > 21 && player.handValue.aceAsTen > 21
          ) {
            player.status = busted;
            bustedHands.push(index);
          }
        });
        // if curerentPlayer is the last remaining player
        if (
          bustedHands.length === players.length - 1 &&
          currentPlayer.status !== busted
        ) {
          currentPlayer.status = winner;
          gameStatus = 2;
        }

        // determine if any hands are blackjack
        players.forEach((player, index) => {
          if (
            player.handValue.aceAsOne === 21 || player.handValue.aceAsTen === 21
          ) {
            player.status = blackjack;
          }
        });

        // Determine which player has the highest-value hand under 21
        let highestHandValue = 0;
        let highestHandPlayer = -1;
        players.forEach((player, index) => {
          if (
            player.handValue.aceAsOne > highestHandValue &&
            player.handValue.aceAsOne <= 21
          ) {
            highestHandValue = player.handValue;
            highestHandPlayer = index;
          }
          if (
            player.handValue.aceAsTen > highestHandValue &&
            player.handValue.aceAsTen <= 21
          ) {
            highestHandValue = player.handValue.aceAsTen;
            highestHandPlayer = index;
          }
        });
        /**
         * @todo if currentPlayer has highest hand, do something. currentplayer wins only if all other players are busted
         */
        console.log("highestHandPlayer", highestHandPlayer);
        if (
          (highestHandPlayer =
            this.state.currentPlayer &&
            bustedHands.indexOf(this.state.currentPlayer) === -1)
        ) {
          gameStatus = 2;
        } else if (
          currentPlayer.status === blackjack &&
          bustedHands.indexOf(this.state.currentPlayer) === -1
        ) {
          gameStatus = 4;
        }
        break;

      case 2: // currentPlayer Wins
        this._showMessageBar("You win!", MessageBarType.success);
        gameStatus = 0;
        break;

      case 3: // human player busted
        this._showMessageBar("Busted!", MessageBarType.warning);
        gameStatus = 0;
        break;

      case 4: // human player blackjack
        this._showMessageBar("Blackjack!", MessageBarType.success);
        gameStatus = 0;
        break;

      case 5: // tie
        this._showMessageBar("Tie?", MessageBarType.warning);
        gameStatus = 0;
        break;

      case 6: // stay (go to next turn)
        this._showMessageBar("Stayed", MessageBarType.info);
        // const nextPlayer = (this.state.currentPlayer + 1) > players.length
        // ? 0
        // : this.state.currentPlayer + 1;

        // temporary
        nextPlayer = this.state.currentPlayer;
        break;

      default:
        // do nothing
        break;
    }

    console.log("nextgamestatus:", nextGameStatus);

    const placeholder = nextPlayer > 0 ? nextPlayer : this.state.currentPlayer;
    this.setState({
      turnCount: this.state.turnCount + 1,
      players,
      gameStatus,
      currentPlayer: placeholder
    });
    console.log("Evaluated Game.");
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
    deck.putOnTopOfDeck(this.state.selected);
    this.setState({ deck });
    this._removeSelectedFromPlayerHand();
    this._removeSelectedFromDrawn();
    this._clearSelected();
  }

  _putOnBottomOfDeck(cards) {
    const deck = this.state.deck;
    deck.putOnBottomOfDeck(this.state.selected);
    this.setState({ deck });
    this._removeSelectedFromPlayerHand();
    this._removeSelectedFromDrawn();
    this._clearSelected();
  }

  _select(cardAttributes) {
    const selected = this.state.selected;
    const selectedCard = new PlayingCard(
      cardAttributes.suit,
      cardAttributes.description,
      cardAttributes.sort
    );
    selected.push(selectedCard);
    this.setState({ selected });
  }

  _deselect(cardAttributes) {
    const selected = this.state.selected;
    const toDelete = selected.filter(function(card) {
      return (
        card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
      );
    });
    const index = selected.indexOf(toDelete);
    selected.splice(index, 1);
    this.setState({ selected });
  }

  _clearSelected() {
    this.setState({ selected: [] });
  }

  _removeSelectedFromPlayerHand(playerIndex, cards) {
    const players = this.state.players;
    let currentPlayer = players[this.state.currentPlayer];
    const selected = this.state.selected;
    selected.forEach(card => {
      const index = currentPlayer.hand.findIndex(element => {
        return element.suit === card.suit && card.sort === card.sort;
      });
      currentPlayer.hand.splice(index, 1);
    });
    currentPlayer.handValue = this._evaluateHand(currentPlayer.hand);
    this.setState({ players });
  }

  _removeSelectedFromDrawn(cards) {
    const drawn = this.state.drawn;
    const selected = this.state.selected;
    selected.forEach(card => {
      const index = drawn.findIndex(element => {
        return element.suit === card.suit && card.sort === card.sort;
      });
      drawn.splice(index, 1);
    });
    this.setState({ drawn });
  }

  _evaluateHand(hand) {
    let handValue = {
      aceAsOne: 0,
      aceAsTen: 0
    };
    // Do not evaluate if the hand is empty!
    if (hand) {
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
    }
    return handValue;
  }

  _showMessageBar(text, type) {
    const messageBarDefinition = this.state.messageBarDefinition;
    messageBarDefinition.text = text;
    messageBarDefinition.type = type;
    this.setState({ messageBarDefinition, isMessageBarVisible: true });
  }

  _toggleDeckVisibility() {
    const isDeckVisible = !this.state.isDeckVisible;
    this.setState({ isDeckVisible });
  }

  _toggleDrawnVisibility() {
    const isDrawnVisible = !this.state.isDrawnVisible;
    this.setState({ isDrawnVisible });
  }

  _toggleSelectedVisibility() {
    const isSelectedVisible = !this.state.isSelectedVisible;
    this.setState({ isSelectedVisible });
  }

  render() {
    const c = this.state.currentPlayer;

    return (
      <div id="Table">
        <div className="ms-Grid">

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">
              {this.state.isMessageBarVisible &&
                <MessageBar
                  messageBarType={this.state.messageBarDefinition.type}
                  isMultiline={this.state.messageBarDefinition.isMultiLine}
                  onDismiss={() =>
                    this.setState({ isMessageBarVisible: false })}
                >
                  {this.state.messageBarDefinition.text}
                </MessageBar>}
            </div>
          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">

              <Player
                controlPanelProps={{
                  shuffle: this._shuffle,
                  putOnBottomOfDeck: this._putOnBottomOfDeck,
                  putOnTopOfDeck: this._putOnTopOfDeck,
                  drawRandom: this._drawRandom,
                  drawFromBottomOfDeck: this._drawFromBottomOfDeck,
                  draw: this._draw,
                  reset: this._reset,
                  deal: this._deal,
                  hit: this._hit,
                  stay: this._stay,
                  resetGame: this._resetGame,
                  gameStatus: this.state.gameStatus,
                  currentPlayer: this.state.players[c],
                  selectedCards: this.state.selected,
                  isDeckVisible: this.state.isDeckVisible,
                  toggleDeckVisibility: this._toggleDeckVisibility,
                  isDrawnVisible: this.state.isDrawnVisible,
                  toggleDrawnVisibility: this._toggleDrawnVisibility,
                  isSelectedVisible: this.state.isSelectedVisible,
                  toggleSelectedVisibility: this.state
                    ._toggleSelectedVisibility,
                  turnCount: this.state.turnCount
                }}
                deckContainerProps={{
                  deck: this.state.players[c].hand,
                  title: this.state.players[c].title,
                  handValue: this.state.players[c].handValue,
                  select: this._select,
                  deselect: this._deselect,
                  hidden: false,
                  isSelectable: true
                }}
              />

              {this.state.isDeckVisible &&
                <DeckContainer
                  deck={this.state.deck.cards}
                  title="Deck"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isDrawnVisible &&
                <DeckContainer
                  deck={this.state.drawn}
                  title="Drawn"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isSelectedVisible &&
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

            </div>
          </div>

        </div>
      </div>
    );
  }
}

export default Table;
