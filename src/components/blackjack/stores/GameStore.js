import { EventEmitter } from "events";

/* IndexedDB State Manager */
import { State } from '../../../lib/State';

/* custom stuff */
import PlayerStore from "./PlayerStore";


import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import StatsStore from "./StatsStore";
import ActivityLogStore from "./ActivityLogStore";


/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "game";
const STORE_NAME = "GameStore"
const GameStore = Object.assign({}, EventEmitter.prototype, {
    // IndexedDB 
    stateManager: new State([STORE_NAME], (name, value) => {
      console.log(`${name} was updated`);
    }),

  // in-memory storage
  state: {
    dealerHasControl: false,
    gameStatus: 0,
    loser: -1,
    minimumBet: 25,
    pot: 0,
    round: 0,
    turnCount: 0,
    winner: -1,
    lastWriteTime: undefined,
  },

  /**
   * notify subscribers of a change in state
   */
  emitChange() { this.emit(CHANGE_EVENT); this.saveAll(); },

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
 * Load saved state from IDB, if available
 * Deprecated; this Store does not really need to persist state currently
 */
  async initialize() {},

  /**
  * save state to local storage
  */
  async saveAll() {
    this.state.lastWriteTime = new Date().toISOString();
    this.stateManager.set(STORE_NAME, this.state);
  },

  /**
   * clear the IDB Store for this Store
   */
  clearStore() { this._gameReset() },

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
    console.log('_gameStay()')
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
        this.state.turnCount++;
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

      case 5 /*   Game Over */:

        break;

      case 4 /*   Human Player Wins       */:
        const winningPlayerTitle = players[0].title;
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
        ActivityLogStore.new({
          description: "wins!",
          name: "Dealer",
          iconName: "Crown",
        });
        this.state.winner = players[1].key;
        this.state.loser = players[0].key;
        PlayerStore._payout(players[1].key, pot);
        GameStore._endGame();
        break;

      default:
        break;
    }
  },

  // Run after every action affecting game state, 
  // to check for endgame conditions
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
        PlayerStore._getHigherHandValue(players[1].key) >
        PlayerStore._getHigherHandValue(players[0].key)
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
