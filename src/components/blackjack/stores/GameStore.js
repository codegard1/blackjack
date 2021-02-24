import { EventEmitter } from "events";

import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

/* idb-keyval */
// import { Store, get, set, clear } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { Store, get, set, clear } from 'idb-keyval';

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
  store: new Store('GameStore', 'State'),

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
 */
  async initialize() {
    console.time(`GameStore#initialize()`);
    for (let key in this.state) {
      let val = await get(key, this.store);
      if (val !== undefined) {
        // console.log(`\tfetched ${key} :: ${val}`);
        // this.state[key] = val;
      }
    }
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
    if (!_evaluateGame(2) && state.gameStatus !== 0) {
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
    // this.state.gameStatus = 1;
  }
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
      _evaluateGame(1);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      _evaluateGame(1);
      GameStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      GameStore._gameStay();
      GameStore.emitChange();
      break;

    /* This method is called after DECK_CLEARHANDS & DECK_DEAL */
    case AppConstants.GAME_NEWROUND:
      GameStore._gameNewRound();
      GameStore.state.gameStatus = 1;
      _evaluateGame(1);
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
_evaluateGame();
      break;

    default:
      break;
  }
});

/**
 * @todo delete this 
 */
let state = GameStore.state;

/*  ========================================================  */

/* method definitions */
function _evaluateGame(statusCode) {

  switch (statusCode) {
    case 1 /*   Game in progress; first play  */:
      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) _ante();
      _endGameTrap();
      break;

    case 2 /*   stay (go to next turn)  */:
      /* If endgame conditions not met   */
      if (!_endGameTrap()) {
        /* increment currentPlayerIndex */
        PlayerStore._nextPlayer();
        state.gameStatus = 1;
        _endGameTrap();
      } else {
        return false;
      }
      break;

    case 4 /*   Human Player Wins       */:
      const winningPlayerTitle = state.players[0].title;
      const messageBarText = state.players[0].hasBlackJack
        ? `${winningPlayerTitle} wins with Blackjack!`
        : `${winningPlayerTitle} wins!`;
      GameStore.setMessageBar(messageBarText, MessageBarType.success);
      ActivityLogStore.new({
        description: "wins!",
        name: winningPlayerTitle,
        iconName: "Crown",
      });

      state.winner = state.players[0].id;
      state.loser = state.players[1].id;
      PlayerStore._payout(0, state.pot);
      _endGame();
      break;

    case 7 /*   Dealer wins   */:
      GameStore.setMessageBar(`Dealer wins!`);
      ActivityLogStore.new({
        description: "wins!",
        name: "Dealer",
        iconName: "Crown",
      });

      state.winner = state.players[1].id;
      state.loser = state.players[0].id;
      PlayerStore._payout(1, state.pot);
      _endGame();
      break;

    default:
      break;
  }

  state.turnCount++;
}

function _endGame() {
  state.gameStatus = 0;
  PlayerStore._allPlayersFinish();
}

/* immediately evaluate game again if status > 2 (endgame condition) */
function _endGameTrap() {
  let nextGameStatus;
  /* Set next game status */
  if (state.players[1].hasBlackJack) {
    nextGameStatus = 7; // Dealer has blackjack ; dealer wins
  } else if (state.players[0].isBusted) {
    nextGameStatus = 7; // Player 0 busted ; dealer wins
  } else if (state.players[1].isBusted) {
    nextGameStatus = 4; // Dealer is busted; Player 0 wins
  } else if (state.players[1].isStaying) {
    if (
      state.players[1].getHigherHandValue() >
      state.players[0].getHigherHandValue()
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
      state.gameStatus = 1; // Wait for next input
      return false;
    }
  }

  /* Endgame Condition encountered! */
  if (nextGameStatus > 2) {
    _evaluateGame(nextGameStatus);

    state.players.forEach(player => {
      /* set properties to increment */
      const statsFrame = {
        numberOfGamesLost: (player.id === state.loser ? 1 : 0),
        numberOfGamesPlayed: 1,
        numberOfGamesWon: (player.id === state.winner ? 1 : 0),
        numberOfTimesBlackjack: (player.hasBlackJack ? 1 : 0),
        numberOfTimesBusted: (player.isBusted ? 1 : 0),
        totalWinnings: (player.id === state.winner ? state.pot : 0)
      };
      StatsStore.update(player.id, statsFrame);
    });
    return true;
  }
}

/* pay a specified amount into the pot */
function _ante(amount = state.minimumBet) {
  PlayerStore._allPlayersAnte(amount);
  state.pot += amount * PlayerStore.length();
  GameStore.setMessageBar(`Ante: $${amount}`);
  ActivityLogStore.new({
    description: `ante $${amount}`,
    name: "All players",
    iconName: "Money",
  });
}

export default GameStore;
