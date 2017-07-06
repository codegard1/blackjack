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
      round: 0,
      pot: 0,
      minimumBet: 25,
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
    this._bet = this._bet.bind(this);
    this._ante = this._ante.bind(this);
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
    this._getPlayerById = this._getPlayerById.bind(this);
    this._getHighestHandValue = this._getHighestHandValue.bind(this);

    // group methods to pass into Player as props
    this.controlPanelMethods = {
      deal: this._deal,
      hit: this._hit,
      bet: this._bet,
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
    const playerId = players.length + 1;
    players.push({
      id: playerId,
      title: title,
      hand: [],
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      status: "ok",
      turn: false,
      bank: 1000,
      bet: 0,
      lastAction: "none",
      isStaying: false
    });
    this.setState({ players });
  }

  _getPlayerById(id) {
    const players = this.state.players;
    const player = players.filter(player => {
      return player.id === id;
    });

    return player[0];
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
    players[index].turn = false;
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
        currentPlayer: 0,
        round: this.state.round + 1,
        pot: 0
      },
      this._showMessageBar("New Round", MessageBarType.info)
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

  _getHighestHandValue(playerId) {
    const player = this._getPlayerById(playerId);
    const handValue = player.handValue;
    let higherHandValue = 0;

    if (handValue.aceAsEleven === handValue.aceAsOne) {
      return handValue.aceAsOne;
    } else {
      higherHandValue = handValue.aceAsOne > handValue.aceAsEleven
        ? handValue.aceAsOne
        : handValue.aceAsEleven;
      return higherHandValue;
    }
  }

  _evaluateGame(
    nextGameStatus = this.state.gameStatus,
    nextPlayer = this.state.currentPlayer
  ) {
    let pot = this.state.pot;
    let players = this.state.players;
    let messageText = "";
    let currentPlayerIndex = this.state.currentPlayer;
    let turnCount = this.state.turnCount;

    const busted = "busted";
    const blackjack = "blackjack";
    const winner = "winner";
    const staying = "staying";

    // evaluate hands
    players.forEach(player => {
      player.handValue = this._evaluateHand(player.hand);

      // set busted status
      if (player.handValue.aceAsOne > 21 && player.handValue.aceAsEleven > 21) {
        player.status = busted;
      }

      // set blackjack status
      if (
        player.handValue.aceAsOne === 21 || player.handValue.aceAsEleven === 21
      ) {
        player.status = blackjack;
      }
    });

    // STAYING PLAYERS
    let stayingPlayers = players.filter(player => player.status === staying);

    // BUSTED PLAYERS
    let bustedPlayers = players.filter(player => player.status === busted);

    // NON-BUSTED PLAYERS
    let nonBustedPlayers = players.filter(player => player.status !== busted);

    // true if all players are staying
    let allPlayersStaying = stayingPlayers.length === players.length;

    // true if all players are busted
    let allPlayersBusted = bustedPlayers.length === players.length;

    // true if all players are not busted
    let allPlayersNonBusted = nonBustedPlayers.length === players.length;

    // determine the non-busted player with the highest value hand
    let highestHandValue = 0;
    let winningPlayerId = 0;
    let winningPlayerIndex = -1;
    let tieFlag = false;

    nonBustedPlayers.forEach(player => {
      let higherHandValue = this._getHighestHandValue(player.id);
      if (higherHandValue > highestHandValue && higherHandValue <= 21) {
        highestHandValue = higherHandValue;
        winningPlayerId = player.id;
        winningPlayerIndex = players.indexOf(player);
      }
    });

    switch (nextGameStatus) {
      case 0: //Off
        this._showMessageBar("Hello", MessageBarType.info);
        break;

      case 1: // Game in progress
        this._showMessageBar("Game in progress", MessageBarType.info);

        // all players bet the minimum to start
        if (turnCount === 0) {
          this._ante();
        }

        // set next game status.
        // if higher than 2, _exitTrap() will catch it
        switch (players[this.state.currentPlayer].status) {
          case busted:
            nextGameStatus = 3;
            break;

          case winner:
            nextGameStatus: 4;
            break;

          case blackjack:
            nextGameStatus: 5;
            break;

          default:
            //do nothing
            break;
        }
        if (tieFlag) {
          nextGameStatus = 6;
        }
        break;

      case 2: // stay (go to next turn)
        this._showMessageBar(
          `${players[this.state.currentPlayer].title} stayed`,
          MessageBarType.info
        );

        // set current player as staying
        players[currentPlayerIndex].status = staying;

        // get the next player by index
        const nextPlayerIndex = this.state.currentPlayer + 1 === players.length
          ? 0
          : this.state.currentPlayer + 1;
        nextPlayer = nextPlayerIndex;

        // re-evaluate STAYING PLAYERS
        stayingPlayers = players.filter(player => player.status === staying);
        allPlayersStaying = stayingPlayers.length === players.length;

        if (!allPlayersStaying) {
          players.forEach(player => {
            // set turn = true for the next player that is not already staying
            player.turn = players.indexOf(player) === nextPlayerIndex &&
              player.status !== staying
              ? true
              : false;
          });
          nextGameStatus = 1;
        } else {
          if (winningPlayerIndex === 0) {
            nextGameStatus = 4;
          }
          if (winningPlayerIndex === 0 && players[0].status === blackjack) {
            nextGameStatus = 5;
          }

          if (winningPlayerIndex === 1) {
            nextGameStatus = 7;
          }
        }
        break;

      case 3: // currentPlayer busted
        messageText = allPlayersBusted
          ? `All players busted!`
          : `${this.state.players[this.state.currentPlayer].title} busted!`;

        this._showMessageBar(messageText, MessageBarType.warning);
        nextGameStatus = 0;

        // don't do engame unless all players are staying and not busted
        if (!allPlayersBusted) {
          players[winningPlayerIndex].status = winner;
          players[winningPlayerIndex].bank += pot;
        }
        break;

      case 4: // currentPlayer Wins
        messageText = `${this.state.players[this.state.currentPlayer].title} wins!`;
        this._showMessageBar(messageText, MessageBarType.success);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          players[winningPlayerIndex].status = winner;
          players[winningPlayerIndex].bank += pot;
        }
        break;

      case 5: // human player blackjack
        this._showMessageBar("Blackjack!", MessageBarType.success);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          players[winningPlayerIndex].status = winner;
          players[winningPlayerIndex].bank += pot;
        }
        break;

      case 6: // tie
        this._showMessageBar("Tie?", MessageBarType.warning);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          players[winningPlayerIndex].status = winner;
          players[winningPlayerIndex].bank += pot;
        }
        break;

      case 7: // non-human player wins
        this._showMessageBar(`${players[1].title} wins!`);

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          players[winningPlayerIndex].status = winner;
          players[winningPlayerIndex].bank += pot;
        }
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

      //clear the pot
      this.setState({ pot: 0 });
    }
  }

  _bet(
    ev,
    target,
    playerIndex = this.state.currentPlayer,
    amount = this.state.minimumBet
  ) {
    let players = this.state.players;
    players[playerIndex].bank -= amount;
    const pot = this.state.pot + amount;
    this.setState({ pot, players });
  }

  _ante(amount = this.state.minimumBet) {
    let players = this.state.players;
    let pot = this.state.pot;

    players.forEach(player => {
      player.bank -= amount;
      pot += amount;
    });
    this.setState(
      { players, pot },
      this._showMessageBar(`Ante: ${amount}`, MessageBarType.info)
    );
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
            minimumBet: this.state.minimumBet,
            hidden: false
          }}
          deckContainerProps={{
            deck: player.hand,
            pot: this.state.pot,
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
            <div className="ms-Grid-col ms-u-s12">
              <p className="ms-font-xl">${this.state.pot}</p>
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
