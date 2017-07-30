import React from "react";
import Shuffle, { PlayingCard } from "shuffle";
import DeckContainer from "./DeckContainer";
import Player from "./Player";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";
import * as D from "./definitions";
import { OptionsPanel } from "./OptionsPanel";
import { BaseComponent } from "./BaseComponent";
import { log } from "./utils";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import { ControlPanelStore } from "./stores/ControlPanelStore";
import { AppActions } from "./actions/AppActions";

export class Table extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      //DeckStore
      deck: [],
      drawn: [],
      selected: [],
      //GameStore
      gameStatus: 0,
      minimumBet: 25,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
      pot: 0,
      round: 0,
      turnCount: 0,
      tieFlag: false,
      // Player (also in GameStore)
      allPlayersStaying: false,
      allPlayersBusted: false,
      allPlayersNonBusted: false,
      currentPlayer: 0,
      players: [],
      playerDefaults: {
        id: 0,
        title: "",
        hand: [],
        handValue: { aceAsOne: 0, aceAsEleven: 0 },
        status: "ok",
        turn: false,
        bank: 1000,
        bet: 0,
        lastAction: "none",
        isStaying: false
      },
      winningPlayerId: -1,
      winningPlayerIndex: -1,
      // ControlPanelStore
      isDeckVisible: true,
      isDrawnVisible: false,
      isSelectedVisible: false,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false
    };

    //Deck Methods
    this._bind(
      "_select",
      "_deselect",
      "_removeSelectedFromPlayerHand",
      "_removeSelectedFromDrawn"
    );

    // ControlPanel methods
    this._bind(
      "_deal",
      "_hit",
      "_bet",
      "_ante",
      "_stay",
      "_draw",
      "_reset",
      "_shuffle",
      "_putOnBottomOfDeck",
      "_putOnTopOfDeck",
      "_drawRandom",
      "_drawFromBottomOfDeck",
      "_clearHand",
      "_toggleDeckVisibility",
      "_toggleDrawnVisibility",
      "_toggleSelectedVisibility",
      "_showOptionsPanel"
    );

    //Game State Methods
    this._bind(
      "_showMessageBar",
      "_evaluateHand",
      "_evaluateGame",
      "_newGame",
      "_getHighestHandValue",
      "_payout",
      "_evaluatePlayers",
      "_resetGame",
      "_newRound"
    );

    //Flux helpers
    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame");

    // group methods to pass into Player as props
    this.controlPanelMethods = {
      deal: this._deal,
      hit: this._hit,
      bet: this._bet,
      stay: this._stay,
      draw: this._draw,
      reset: this._reset,
      shuffle: this._shuffle,
      putOnBottomOfDeck: this._putOnBottomOfDeck,
      putOnTopOfDeck: this._putOnTopOfDeck,
      drawRandom: this._drawRandom,
      drawFromBottomOfDeck: this._drawFromBottomOfDeck,
      showOptionsPanel: this._showOptionsPanel,
      newRound: this._newRound
    };
    this.deckMethods = {
      select: this._select,
      deselect: this._deselect,
      removeSelectedFromPlayerHand: this._removeSelectedFromPlayerHand,
      removeSelectedFromDrawn: this._removeSelectedFromDrawn,
      clearHand: this._clearHand
    };
    this.OptionsPanelMethods = {
      toggleDeckVisibility: this._toggleDeckVisibility,
      toggleSelectedVisibility: this._toggleSelectedVisibility,
      toggleDrawnVisibility: this._toggleDrawnVisibility,
      resetGame: this._resetGame
    };
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);

    const players = ["Chris", "Dealer"];
    AppActions.newGame(players);
    AppActions.newDeck();
  }

  componentWillUnmount() {
    /* remove change listeners */
    /* this is redundant because Table never unmounts */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
  }

  /* flux helpers */
  onChangeGame() {
    const newState = GameStore.getState();
    log(`onChangeGame: ${newState}`);
    this.setState({
      allPlayersStaying: newState.allPlayersStaying,
      allPlayersBusted: newState.allPlayersBusted,
      allPlayersNonBusted: newState.allPlayersNonBusted,
      bustedPlayers: newState.bustedPlayers,
      currentPlayer: newState.currentPlayer,
      currentPlayerIndex: newState.currentPlayerIndex,
      gameStatus: newState.gameStatus,
      highestHandValue: newState.highestHandValue,
      minimumBet: newState.minimumBet,
      nonBustedPlayers: newState.nonBustedPlayers,
      tieFlag: newState.tieFlag,
      turnCount: newState.turnCount,
      players: newState.players,
      pot: newState.pot,
      round: newState.round,
      winningPlayerId: newState.winningPlayerId,
      winningPlayerIndex: newState.winningPlayerIndex
    });
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    log(newState);
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      draw: newState.drawn
    });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    log(`onChangeControlPanel: ${JSON.stringify(newState)}`);
    this.setState({
      isDeckVisible: newState.isDeckVisible,
      isDrawnVisible: newState.isDrawnVisible,
      isSelectedVisible: newState.isSelectedVisible,
      isOptionsPanelVisible: newState.isOptionsPanelVisible,
      isMessageBarVisible: newState.isMessageBarVisible,
      messageBarDefinition: newState.messageBarDefinition
    });
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
    AppActions.shuffle();
  }

  _resetGame() {
    AppActions.newDeck();
    const players = this.state.players;
    players.forEach(player => {
      player.bank = this.state.playerDefaults.bank;
    });
    this.state.players.forEach((player, index) => {
      this._clearHand(index);
    });
    this.setState(
      {
        players,
        drawn: [],
        selected: [],
        gameStatus: 0,
        turnCount: 0,
        currentPlayer: 0,
        round: 0,
        pot: 0
      },
      AppActions.showMessageBar("Game Reset")
    );
  }

  _newRound() {
    AppActions.newDeck();
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

  _reset() {
    AppActions.reset();
  }

  _draw(num) {
    AppActions.draw(num);
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
    AppActions.drawFromBottomOfDeck(num);
  }

  _drawRandom(num) {
    AppActions.drawRandom(num);
  }

  _putOnTopOfDeck(cards) {
    AppActions.putOnTopOfDeck(cards);
    AppActions.removeSelectedFromPlayerHand(cards);
  }

  _putOnBottomOfDeck(cards) {
    AppActions.putOnBottomOfDeck(cards);
    AppActions.removeSelectedFromPlayerHand(cards);
  }

  _select(cardAttributes) {
    AppActions.select(cardAttributes);
  }

  _deselect(cardAttributes) {
    AppActions.deselect(cardAttributes);
  }

  _removeSelectedFromPlayerHand(playerIndex = this.state.currentPlayer, cards) {
    AppActions.removeSelectedFromPlayerHand(playerIndex, cards);
  }

  _removeSelectedFromDrawn(cards) {
    AppActions.removeSelectedFromDrawn(cards);
  }

  _showMessageBar(text, type) {
    AppActions.showMessageBar(text, type);
  }

  _toggleDeckVisibility(bool) {
    // this.setState({ isDeckVisible: bool });
    AppActions.toggleDeckVisibility(bool);
  }

  _toggleDrawnVisibility(bool) {
    // this.setState({ isDrawnVisible: bool });
    AppActions.toggleDrawnVisibility(bool);
  }

  _toggleSelectedVisibility(bool) {
    // this.setState({ isSelectedVisible: bool });
    AppActions.toggleSelectedVisibility(bool);
  }

  _evaluateHand(hand) {
    return AppActions.evaluateHand(hand);
  }

  _getHighestHandValue(player) {
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
    // set player status, handValue, and other flags
    this._evaluatePlayers();

    let messageText = "";
    let currentPlayerIndex = this.state.currentPlayer;
    let turnCount = this.state.turnCount;
    let tieFlag = this.state.tieFlag;
    let allPlayersStaying = this.state.allPlayersStaying;
    let allPlayersBusted = this.state.allPlayersBusted;
    // let allPlayersNonBusted = this.state.allPlayersNonBusted;
    // let winningPlayerId = this.state.winningPlayerId;
    let winningPlayerIndex = this.state.winningPlayerIndex;
    let players = this.state.players;
    const currentPlayerStatus = players[currentPlayerIndex].status;

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
        // if higher than 2, _exitTrap() will catch it and re-run _evaluateGame()
        switch (currentPlayerStatus) {
          case D.busted:
            nextGameStatus = 3;
            break;

          case D.winner:
            nextGameStatus = 4;
            break;
          // case D.blackjack:
          //   nextGameStatus = 5;
          //   break;


          default:
            //do nothing
            break;
        }
        if (tieFlag) {
          nextGameStatus = 6;
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus,
            currentPlayer: nextPlayer
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      case 2: // stay (go to next turn)
        this._showMessageBar(
          `${players[this.state.currentPlayer].title} stayed`,
          MessageBarType.info
        );

        // set current player as staying
        players[currentPlayerIndex].status = D.staying;
        players[currentPlayerIndex].isStaying = true;

        // get the next player by index
        const nextPlayerIndex = currentPlayerIndex + 1 === players.length
          ? 0
          : currentPlayerIndex + 1;
        nextPlayer = nextPlayerIndex;

        // re-evaluate STAYING PLAYERS
        const stayingPlayers = players.filter(
          player => player.status === D.staying
        );
        allPlayersStaying = stayingPlayers.length === players.length;

        if (!allPlayersStaying) {
          players.forEach(player => {
            // set turn = true for the next player that is not already staying
            player.turn = players.indexOf(player) === nextPlayerIndex &&
              player.status !== D.staying
              ? true
              : false;
          });
          nextGameStatus = 1;
        } else {
          if (winningPlayerIndex === 0) {
            nextGameStatus = 4;
          }
          if (winningPlayerIndex === 0 && players[0].status === D.blackjack) {
            nextGameStatus = 5;
          }
          if (winningPlayerIndex === 1) {
            nextGameStatus = 7;
          }
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus,
            currentPlayer: nextPlayer
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      case 3: // currentPlayer busted
        messageText = allPlayersBusted
          ? `All players busted!`
          : `${this.state.players[this.state.currentPlayer].title} busted!`;

        this._showMessageBar(messageText, MessageBarType.warning);
        nextGameStatus = 0;

        // don't do engame unless all players are staying and not busted
        if (!allPlayersBusted) {
          this._payout();
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      case 4: // currentPlayer Wins
        const winningPlayerTitle = this.state.players[winningPlayerIndex].title;
        messageText = `${winningPlayerTitle} wins!`;
        this._showMessageBar(messageText, MessageBarType.success);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          this._payout();
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      case 5: // human player blackjack
        this._showMessageBar("Blackjack!", MessageBarType.success);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          this._payout();
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      case 6: // tie
        this._showMessageBar("Tie?", MessageBarType.warning);
        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          this._payout();
        }
        break;

      case 7: // non-human player wins
        this._showMessageBar(`${players[1].title} wins!`);

        nextGameStatus = 0;

        // don't do payout unless all players are staying and not busted
        if (!allPlayersBusted) {
          this._payout();
        }

        this.setState(
          {
            turnCount: this.state.turnCount + 1,
            gameStatus: nextGameStatus
          },
          this._endGameTrap(nextGameStatus)
        );
        break;

      default:
        // do nothing
        break;
    }
  }

  // immediately evaluate game again if status > 2 (endgame condition)
  _endGameTrap(statusCode) {
    if (statusCode > 2) {
      this._evaluateGame(statusCode);
    }
  }

  _evaluatePlayers(players = this.state.players) {
    // evaluate hands
    players.forEach(player => {
      player.handValue = this._evaluateHand(player.hand);

      // set busted status
      if (player.handValue.aceAsOne > 21 && player.handValue.aceAsEleven > 21) {
        player.status = D.busted;
      }

      // set blackjack status
      if (
        player.handValue.aceAsOne === 21 || player.handValue.aceAsEleven === 21
      ) {
        player.status = D.blackjack;
      }
    });

    // STAYING PLAYERS
    const stayingPlayers = players.filter(player => player.isStaying === true);

    // BUSTED PLAYERS
    const bustedPlayers = players.filter(player => player.status === D.busted);

    // NON-BUSTED PLAYERS
    const nonBustedPlayers = players.filter(
      player => player.status !== D.busted
    );

    // true if all players are staying
    const allPlayersStaying = stayingPlayers.length === players.length;

    // true if all players are busted
    const allPlayersBusted = bustedPlayers.length === players.length;

    // true if all players are not busted
    const allPlayersNonBusted = nonBustedPlayers.length === players.length;

    // determine the non-busted player with the highest value hand
    let highestHandValue = 0;
    let winningPlayerId = -1;
    let winningPlayerIndex = -1;
    let tieFlag = this.state.tieFlag;

    if (nonBustedPlayers.length === 1) {
      nonBustedPlayers[0].status = D.winner;
    } else {
      nonBustedPlayers.forEach(player => {
        let higherHandValue = this._getHighestHandValue(player);
        if (higherHandValue > highestHandValue && higherHandValue <= 21) {
          highestHandValue = higherHandValue;
          winningPlayerId = player.id;
          winningPlayerIndex = players.indexOf(player);
        }
      });
    }

    this.setState({
      players,
      tieFlag,
      allPlayersStaying,
      allPlayersBusted,
      allPlayersNonBusted,
      winningPlayerId,
      winningPlayerIndex
    });
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

  _ante(
    amount = this.state.minimumBet,
    players = this.state.players,
    pot = this.state.pot
  ) {
    players.forEach(player => {
      player.bank -= amount;
      pot += amount;
    });

    this.setState(
      { players, pot },
      this._showMessageBar(`Ante: $${amount}`, MessageBarType.info)
    );
  }

  _payout(
    players = this.state.players,
    index = this.state.winningPlayerIndex,
    amount = this.state.pot
  ) {
    players[index].status = D.winner;
    players[index].bank += amount;

    this.setState({ players, pot: 0 });
  }

  /* show the Options Panel */
  _showOptionsPanel() {
    this.setState({ isOptionsPanelVisible: true });
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
                  title="Drawn Cards"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isSelectedVisible &&
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected Cards"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

            </div>
          </div>

          <OptionsPanel
            isOptionsPanelVisible={this.state.isOptionsPanelVisible}
            {...this.OptionsPanelMethods}
          />
        </div>
      </div>
    );
  }
}

export default Table;
