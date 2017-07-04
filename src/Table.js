import React, { Component } from "react";
import Shuffle from "shuffle";
import DeckContainer from "./DeckContainer";
import Player from "./Player";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";

const PlayingCard = require("shuffle/lib/playingCard");

export class Table extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deck: [],
      drawn: [],
      selected: [],
      gameStatus: 0,
      players: [],
      currentPlayer: 0,
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
    this._select = this._select.bind(this);
    this._deselect = this._deselect.bind(this);
    this._removeSelectedFromPlayerHand = this._removeSelectedFromPlayerHand.bind(
      this
    );
    this._removeSelectedFromDrawn = this._removeSelectedFromDrawn.bind(this);

    // ControlPanel methods
    this._deal = this._deal.bind(this);
    this._hit = this._hit.bind(this);
    this._stay = this._stay.bind(this);
    this._draw = this._draw.bind(this);
    this._reset = this._reset.bind(this);
    this._shuffle = this._shuffle.bind(this);
    this._resetGame = this._resetGame.bind(this);
    this._putOnBottomOfDeck = this._putOnBottomOfDeck.bind(this);
    this._putOnTopOfDeck = this._putOnTopOfDeck.bind(this);
    this._drawRandom = this._drawRandom.bind(this);
    this._drawFromBottomOfDeck = this._drawFromBottomOfDeck.bind(this);
    this._clearHand = this._clearHand.bind(this);
    this._toggleDeckVisibility = this._toggleDeckVisibility.bind(this);
    this._toggleDrawnVisibility = this._toggleDrawnVisibility.bind(this);
    this._toggleSelectedVisibility = this._toggleSelectedVisibility.bind(this);

    //Game State Methods
    this._showMessageBar = this._showMessageBar.bind(this);
    this._evaluateHand = this._evaluateHand.bind(this);
    this._evaluateGame = this._evaluateGame.bind(this);
    this._newPlayer = this._newPlayer.bind(this);
    this._newGame = this._newGame.bind(this);

    // group methods to pass into Player as props
    this.controlPanelMethods = {
      deal: this._deal,
      hit: this._hit,
      stay: this._stay,
      draw: this._draw,
      reset: this._reset,
      shuffle: this._shuffle,
      resetGame: this._resetGame,
      putOnBottomOfDeck: this._putOnBottomOfDeck,
      putOnTopOfDeck: this._putOnTopOfDeck,
      drawRandom: this._drawRandom,
      drawFromBottomOfDeck: this._drawFromBottomOfDeck,
      toggleDeckVisibility: this._toggleDeckVisibility,
      toggleDrawnVisibility: this._toggleDrawnVisibility,
      toggleSelectedVisibility: this._toggleSelectedVisibility
    };
    this.deckMethods = {
      select: this._select,
      deselect: this._deselect,
      removeSelectedFromPlayerHand: this._removeSelectedFromPlayerHand,
      removeSelectedFromDrawn: this._removeSelectedFromDrawn,
      clearHand: this._clearHand
    };
  }

  componentDidMount() {
    const players = ["Chris", "Dealer"];
    players.forEach(player => {
      this._newPlayer(player);
    });
    this._newDeck();
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
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      status: "ok",
      turn: false
    };
    players.push(newPlayer);
    this.setState({ players });
  }

  /**
 * @todo use this to instantiate Players and Deck, instead of doing it in componentWillMount
 */
  _newGame() {
    // game Initialization
    this._evaluateGame(1);
  }

  _clearHand(index) {
    const players = this.state.players;
    players[index].hand = [];
    players[index].handValue = { aceAsOne: 0, aceAsEleven: 0 };
    players[index].status = "ok";
    this.setState({ players });
  }

  _shuffle() {
    const deck = this.state.deck;
    deck.shuffle();
    this.setState({ deck });
  }

  _resetGame() {
    this._newDeck();
    this.state.players.forEach((player, index) => {
      this._clearHand(index);
    });
    this.setState(
      {
        drawn: [],
        selected: [],
        gameStatus: 0,
        turnCount: 0,
        currentPlayer: 0
      },
      this._showMessageBar("Game reset", MessageBarType.info)
    );
  }

  /**
   * @todo rename to _resetHand
   */
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
    players.forEach(player => {
      player.hand = deck.draw(2);
    });
    players[this.state.currentPlayer].turn = true;

    this.setState(
      {
        deck,
        players
      },
      this._evaluateGame(1)
    );
  }

  _hit(ev, target, index = this.state.currentPlayer) {
    let deck = this.state.deck;
    let drawn = this.state.drawn;
    let players = this.state.players;
    let currentPlayer = players[index];
    const ret = deck.draw(1);
    drawn.push(ret);
    currentPlayer.hand.push(ret);

    this.setState({ deck, drawn, players }, this._evaluateGame(1));
  }

  _stay() {
    this._evaluateGame(2);
  }

  _drawFromBottomOfDeck(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.drawFromBottomOfDeck(num);
    drawn.push(ret);
    console.log("drawFromBottomOfDeck:", ret);
    this.setState({ deck, drawn });
  }

  _drawRandom(num) {
    const deck = this.state.deck;
    const drawn = this.state.drawn;
    const ret = deck.drawRandom(num);
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

  /**
 * @todo use PlayingCard object per se instead of cardAttributes
 * @param {Object} cardAttributes - the suit, description, and sort values to assign to the selected card 
 */
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

  _removeSelectedFromPlayerHand(playerIndex = this.state.currentPlayer, cards) {
    const players = this.state.players;
    let currentPlayer = players[playerIndex];
    const selected = this.state.selected;
    selected.forEach(card => {
      const index = currentPlayer.hand.findIndex(element => {
        return element.suit === card.suit && card.sort === card.sort;
      });
      currentPlayer.hand.splice(index, 1);
    });
    //currentPlayer.handValue = this._evaluateHand(currentPlayer.hand);
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

  _showMessageBar(text, type) {
    this.setState({
      messageBarDefinition: {
        text: text,
        type: type
      },
      isMessageBarVisible: true
    });
  }

  _toggleDeckVisibility() {
    this.setState({ isDeckVisible: !this.state.isDeckVisible });
  }

  _toggleDrawnVisibility() {
    this.setState({ isDrawnVisible: !this.state.isDrawnVisible });
  }

  _toggleSelectedVisibility() {
    this.setState({ isSelectedVisible: !this.state.isSelectedVisible });
  }

  _evaluateHand(hand) {
    let handValue = {
      aceAsOne: 0,
      aceAsEleven: 0
    };
    // Do not evaluate if the hand is empty!
    if (hand.length > 0) {
      hand.forEach(card => {
        switch (card.sort) {
          case 14:
            handValue.aceAsOne += 1;
            handValue.aceAsEleven += 11;
            break;

          case 13:
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          case 12:
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          case 11:
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          default:
            handValue.aceAsOne += card.sort;
            handValue.aceAsEleven += card.sort;
            break;
        }
      });
    }
    return handValue;
  }

  _evaluateGame(
    nextGameStatus = this.state.gameStatus,
    nextPlayer = this.state.currentPlayer
  ) {
    let players = this.state.players;

    const busted = "busted";
    const blackjack = "blackjack";
    const winner = "winner";

    console.log("nextGameStatus", nextGameStatus);

    switch (nextGameStatus) {
      case 0: //Off
        this._showMessageBar("Hello", MessageBarType.info);
        break;

      case 1: // New Game
        this._showMessageBar("Game in progress", MessageBarType.info);

        // evaluate hands
        players.forEach(player => {
          player.handValue = this._evaluateHand(player.hand);

          // set busted status
          if (
            player.handValue.aceAsOne > 21 && player.handValue.aceAsEleven > 21
          ) {
            player.status = busted;
          }

          // set blackjack status
          if (
            player.handValue.aceAsOne === 21 || player.handValue.aceAsEleven === 21
          ) {
            player.status = blackjack;
          }
        });

        if (players[this.state.currentPlayer].status === busted) {
          nextGameStatus = 3;
        }
        if (players[this.state.currentPlayer].status === winner) {
          nextGameStatus: 4;
        }
        if (players[this.state.currentPlayer].status === blackjack) {
          nextGameStatus: 5;
        }
        break;

      case 2: // stay (go to next turn)
        this._showMessageBar("Stayed", MessageBarType.info);
        const nextPlayerIndex = this.state.currentPlayer + 1 === players.length
          ? 0
          : this.state.currentPlayer + 1;
        nextPlayer = nextPlayerIndex;
        players.forEach(player => {
          player.turn = players.indexOf(player) === nextPlayerIndex
            ? true
            : false;
        });
        break;

      case 3: // human player busted
        this._showMessageBar("Busted!", MessageBarType.warning);
        nextGameStatus = 0;
        break;

      case 4: // currentPlayer Wins
        this._showMessageBar("You win!", MessageBarType.success);
        nextGameStatus = 0;
        break;

      case 5: // human player blackjack
        this._showMessageBar("Blackjack!", MessageBarType.success);
        nextGameStatus = 0;
        break;

      case 6: // tie
        this._showMessageBar("Tie?", MessageBarType.warning);
        //nextGameStatus = 0;
        break;

      default:
        // do nothing
        break;
    }

    this.setState(
      {
        turnCount: this.state.turnCount + 1,
        players,
        gameStatus: nextGameStatus,
        currentPlayer: nextPlayer
      },
      this._endGameTrap(nextGameStatus)
    );
  }

  // immediately evaluate game again if status > 2 (endgame condition)
  _endGameTrap(statusCode) {
    if (statusCode > 2) {
      this._evaluateGame(statusCode);
    }
  }

  render() {
    const playersArray = this.state.players.map((player, index) => {
      return (
        <Player
          key={index}
          player={player}
          controlPanelMethods={this.controlPanelMethods}
          deckMethods={this.deckMethods}
          controlPanelProps={{
            gameStatus: this.state.gameStatus,
            currentPlayer: this.state.currentPlayer,
            selectedCards: this.state.selected,
            isDeckVisible: this.state.isDeckVisible,
            isDrawnVisible: this.state.isDrawnVisible,
            isSelectedVisible: this.state.isSelectedVisible,
            turnCount: this.state.turnCount,
            hidden: false
          }}
          deckContainerProps={{
            deck: player.hand,
            title: player.title,
            handValue: player.handValue,
            isSelectable: true,
            hidden: false
          }}
        />
      );
    });

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
            <div className="ms-Grid-col ms-u-sm6">
              {playersArray[0]}
            </div>

            <div className="ms-Grid-col ms-u-sm6">
              {playersArray[1]}
            </div>

          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">

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
