import { MessageBarType } from "@fluentui/react"
import { EventEmitter } from "events";

import { MessageBar, MessageBarType } from "@fluentui/react";

/* idb-keyval */
// import { Store, get, set, clear } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { get, set, clear, createStore } from 'idb-keyval';

/* custom stuff */
import PlayerStore from "./PlayerStore";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import StatsStore from "./StatsStore";
import ActivityLogStore from "./ActivityLogStore";



/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "game";
const GameStore = Object.assign({}, EventEmitter.prototype, {
  // Local storage
  store: createStore('GameStore', 'State'),

  // in-memory storage
  state: {
    dealerHasControl: false,
    gameStatus: 0,
    isMessageBarVisible: false,
    loser: -1,
    minimumBet: 25,
    pot: 0,
    round: 0,
    turnCount: 0,
    winner: -1,
    messageBarDefinition: {
      type: MessageBarType.info,
      text: "",
      isMultiLine: false
    },
    lastWriteTime: undefined,
  },

  /**
   * notify subscribers of a change in state
   */
  emitChange() { this.emit(CHANGE_EVENT); console.log('GameStore#emitChange()'); },

  /**
   * subscribe to this Store
   * @param {function} callback 
   */
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  /**
   * unsubscribe from this store
   * @param {function} callback 
   */
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  /**
   * return state to a subscriber
   */
  getState() { return this.state },

  /**
   * return game status
   */
  getStatus() { return this.state.gameStatus },

  /**
   * set message bar text
   * @param {string} text 
   * @param {MessageBarType} type 
   */
  setMessageBar(text, type = MessageBarType.info) {
    this.state.messageBarDefinition = { text, type, isMultiLine: false };
    this.state.isMessageBarVisible = true;
  },

  /**
   * hide the Message Bar
   */
  hideMessageBar() {
    this.state.isMessageBarVisible = false;
  },

  /**
 * Load saved state from IDB, if available
 * Deprecated; this Store does not really need to persist state currently
 */
  async initialize() {
    console.time(`GameStore#initialize()`);

    // for (let key in this.state) {
    // let val = await get(key, this.store);
    // if (val !== undefined) {
    // console.log(`\tfetched ${key} :: ${val}`);
    // this.state[key] = val;
    // }
    // }
  },

  /**
  * save state to local storage
  */
  async saveAll() {
    this.state.lastWriteTime = new Date().toISOString();
    console.log(`GameStore#saveAll`);
    for (let key in this.state) {
      // console.log(`${key} :: ${this.state[key]}`);
      await set(key, this.state[key], this.store);
    }
  },

  /**
   * clear the IDB Store for this Store
   */
  async clearStore() { await clear(this.store) },

  /**
   * reset game state props
   */
  _gameReset() {
    this.state.dealerHasControl = false;
    this.state.gameStatus = 0;
    this.state.pot = 0;
    this.state.round = 0;
    this.state.round = 0;
    this.state.turnCount = 0;
  },

  /**
   * Set game status to 1 (Playing)
   */
  _gameDeal() {
    this.state.gameStatus = 1;
  },

  /**
   * @todo determine what this method does
   */
  _gameStay() {
    if (!this._evaluateGame(2) && this.state.gameStatus !== 0) {
      this.state.dealerHasControl = true;
    }
  },

  /**
   * Reset game state variables for a new round
   */
  _gameNewRound() {
    /* reset state props to default */
    this.state.dealerHasControl = false;
    this.state.gameStatus = 0;
    this.state.pot = 0;
    this.state.round += 1;
    this.state.turnCount = 0;

    /* start a new round with a new deck */
    // PlayersStore.currentPlayer.startTurn();
    this.state.gameStatus = 1;
  },

  _endGame() {
    this.state.gameStatus = 0;
  },

  _ante(amount = this.state.minimumBet) {
    // PlayerStore._allPlayersAnte(amount);
    this.state.pot += amount * PlayerStore.length();
    ActivityLogStore.new({
      description: `ante $${amount}`,
      name: "All players",
      iconName: "Money",
    });
  },

  _evaluateGame(statusCode = this.state.statusCode) {
    const players = PlayerStore.getPlayers();
    const { turnCount, pot } = this.state;

    switch (statusCode) {
      case 1 /*   Game in progress; first play  */:
        /*   all players bet the minimum to start  */
        if (turnCount === 0) this._ante();
        this._endGameTrap();
        break;

      case 2 /*   stay (go to next turn)  */:
        /* If endgame conditions not met   */
        if (!this._endGameTrap()) {
          /* increment currentPlayerIndex */
          PlayerStore._nextPlayer();
          this.state.gameStatus = 1;
          this._endGameTrap();
        } else {
          return false;
        }
        break;

      case 4 /*   Human Player Wins       */:
        const winningPlayerTitle = players[0].title;
        const messageBarText = players[0].hasBlackJack
          ? `${winningPlayerTitle} wins with Blackjack!`
          : `${winningPlayerTitle} wins!`;
        this.setMessageBar(messageBarText, MessageBarType.success);
        ActivityLogStore.new({
          description: "wins!",
          name: winningPlayerTitle,
          iconName: "Crown",
        });

        this.state.winner = players[0].key;
        this.state.loser = players[1].key;
        PlayerStore._payout(players[0].key, pot);
        this._endGame();
        break;

      case 7 /*   Dealer wins   */:
        GameStore.setMessageBar(`Dealer wins!`);
        ActivityLogStore.new({
          description: "wins!",
          name: "Dealer",
          iconName: "Crown",
        });

        this.state.winner = players[1].key;
        this.state.loser = players[0].key;
        PlayerStore._payout(1, pot);
        GameStore._endGame();
        break;

      default:
        break;
    }

    this.state.turnCount++;
  },

  _endGameTrap() {
    let nextGameStatus;
    const players = PlayerStore.getPlayers();

    /* Set next game status */
    if (players[1].hasBlackJack) {
      nextGameStatus = 7; // Dealer has blackjack ; dealer wins
    } else if (players[0].isBusted) {
      nextGameStatus = 7; // Player 0 busted ; dealer wins
    } else if (players[1].isBusted) {
      nextGameStatus = 4; // Dealer is busted; Player 0 wins
    } else if (players[1].isStaying) {
      if (
        players[1].getHigherHandValue() >
        players[0].getHigherHandValue()
      ) {
        nextGameStatus = 7; // Dealer has higher hand ; dealer wins
      } else {
        nextGameStatus = 4; // Player 0 has higher hand ; Player 0 wins
      }
    } else {
      if (PlayerStore._isCurrentPlayerNPC()) {
        return true;
      } else {
        /* player 0 is not Dealer */
        this.state.gameStatus = 1; // Wait for next input
        return false;
      }
    }

    /* Endgame Condition encountered! */
    if (nextGameStatus > 2) {
      this._evaluateGame(nextGameStatus);

      players.forEach(player => {
        /* set properties to increment */
        const statsFrame = {
          numberOfGamesLost: (player.key === this.state.loser ? 1 : 0),
          numberOfGamesPlayed: 1,
          numberOfGamesWon: (player.key === this.state.winner ? 1 : 0),
          numberOfTimesBlackjack: (player.hasBlackJack ? 1 : 0),
          numberOfTimesBusted: (player.isBusted ? 1 : 0),
          totalWinnings: (player.key === this.state.winner ? this.state.pot : 0)
        };
        StatsStore.update(player.key, statsFrame);
      });
      return true;
    }
  },

});

/*  ========================================================  */
/* Responding to Actions */
AppDispatcher.register(action => {
  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      GameStore.initialize().then(() => {
        console.timeEnd(`GameStore#initialize()`);
        GameStore.emitChange();
      });
      break;

    case AppConstants.CLEAR_STORES:
      GameStore.clearStore();
      break;

    case AppConstants.GAME_RESET:
      GameStore._gameReset();
      GameStore.emitChange();
      break;

    case AppConstants.GAME_DEAL:
      GameStore._gameDeal();
      GameStore._evaluateGame(1);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      GameStore._evaluateGame(1);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      GameStore._gameStay();
      GameStore.emitChange();
      break;

    /* This method is called after DECK_CLEARHANDS & DECK_DEAL */
    case AppConstants.GAME_NEWROUND:
      GameStore._gameNewRound();
      // GameStore.state.gameStatus = 1;
      GameStore._evaluateGame(GameStore.getStatus);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_SHOWMESSAGEBAR:
      GameStore.setMessageBar(action.text, action.type);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIDEMESSAGEBAR:
      GameStore.hideMessageBar();
      GameStore.emitChange();
      break;

    case AppConstants.GLOBAL_EVALUATEGAME:
      GameStore._evaluateGame();
      break;

    case AppConstants.GLOBAL_ENDGAME:
      GameStore._endGame();
      GameStore.emitChange();
      break;

    default:
      break;
  }
});

/*  ========================================================  */

export default GameStore;
