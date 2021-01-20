import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
// import { Store, get, set } from 'idb-keyval';

// custom stuff
import Player from "./Player";
import { DeckStore } from "./DeckStore";
import { defaultPlayers, defaultPlayersObj } from "../definitions";

// Deprecated but still in use until the EventEmitter class is ready to take over
export default class PlayerStore {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.currentPlayer = {
      bet: amount => this.currentPlayerBets(amount).bind(this),
      finish: this.currentPlayerFinishes.bind(this),
      hit: this.currentPlayerHits.bind(this),
      startTurn: this.currentPlayerStartsTurn.bind(this),
      stay: this.currentPlayerStays.bind(this)
    };
  }
  /* return all players */
  getPlayer(id) {
    const i = this.getIndex(id);
    return this.players[i];
  }
  getPlayers() {
    return this.players;
  }
  getCurrentPlayer() {
    const i = this.currentPlayerIndex;
    return this.players[i];
  }
  getIndex(id) {
    return this.players.findIndex(player => player.id === id);
  }
  /* return the Id of a player */
  getId(index) {
    return this.players[index].id;
  }

  /* add a new Player to the array */
  newPlayer(...props) {
    this.players.push(new Player(...props));
  }

  /* cycle currentPlayerIndex  */
  nextPlayer() {
    this.currentPlayerIndex =
      this.currentPlayerIndex + 1 >= this.length()
        ? 0
        : this.currentPlayerIndex + 1;
    this.currentPlayer.startTurn();
  }

  /* reset props on the specified player */
  resetPlayer(id, ...keys) {
    const i = this.getIndex(id);
    this.players[i].reset(...keys);
  }

  /* set players' status, hand values */
  evaluatePlayers() {
    this.players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.setStatus();
    });
  }

  finish(id) {
    this.players[this.getIndex(id)].finish();
  }

  stay(id) {
    this.players(this.getIndex(id)).stay();
  }

  currentPlayerStays() {
    const i = this.currentPlayerIndex;
    this.players[i].stay();
  }
  currentPlayerHits() {
    const i = this.currentPlayerIndex;
    this.players[i].hit();
  }
  currentPlayerStartsTurn() {
    const i = this.currentPlayerIndex;
    this.players[i].startTurn();
  }
  currentPlayerFinishes() {
    const i = this.currentPlayerIndex;
    this.players[i].finish();
  }
  currentPlayerBets(amount) {
    const i = this.currentPlayerIndex;
    this.players[i].bet(amount);
  }
  isCurrentPlayerNPC() {
    const i = this.currentPlayerIndex;
    // console.log(`this.players[${i}].isNPC === ${this.players[i].isNPC}`);
    return this.players[i].isNPC;
  }

  allPlayersAnte(amount) {
    this.players.forEach(player => {
      player.ante(amount);
    });
  }

  length() {
    return this.players.length;
  }

  startTurn(id) {
    this.players[this.getIndex(id)].turn = true;
    this.players[this.getIndex(id)].isFinished = false;
  }

  newRound() {
    /* reset all players' status props for new Round */
    this.players.forEach(player => player.resetStatus());
    this.currentPlayerIndex = 0;
  }

  newGame() {
    /* reset all players' props for new Game */
    this.players.forEach(player => player.resetAll());
    this.currentPlayerIndex = 0;
  }

  allPlayersFinish() {
    this.players.forEach(player => {
      player.finish();
    });
  }

  payout(index, amount) {
    this.players[index].bank += amount;
  }
}



const CHANGE_EVENT = "playerStore";
export const PlayerStore1 = Object.assign({}, EventEmitter.prototype, {

  // cached state
  store: new Store('PlayerStore', 'State'),

  // in-memory state
  state: {
    players: {},
    activePlayers: [],
    currentPlayerId: 0,
    lastWriteTime: undefined,
  },

  // Default values for a player record
  defaultPlayerState: {
    // id: undefined,
    // isNPC: undefined,
    // title: undefined,
    bank: 1000,
    bet: 0,
    handValue: { aceAsOne: 0, aceAsEleven: 0 },
    hasBlackjack: false,
    isBusted: false,
    isFinished: false,
    isStaying: false,
    lastAction: "none",
    status: "ok",
    turn: false,
  },

  /**
   *  return state to a subscriber
   */
  getState() { return this.state },

  /**
   * notify subscribers of a state change
   */
  emitChange() {
    this.emit(CHANGE_EVENT);
    this.saveAll();
  },

  /**
   * subscribe to this store 
   * @param {function} callback 
   */
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },


  /**
   * unsubscribe from this store
   * @param {function} callback 
   */
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  /**
   * Load saved state from IDB, if available
   */
  async initialize() {
    console.time(`PlayerStore#initialize()`);
    for (let key in this.state) {
      let val = await get(key, this.store);
      if (val !== undefined) {
        // console.log(`\tfetched ${key} :: ${val}`);
        this.state[key] = val;
      }
    }
  },

  /**
   * save state to local storage
   */
  async saveAll() {
    this.state.lastWriteTime = new Date().toISOString();
    console.log(`PlayerStore#saveAll`);
    for (let key in this.state) {
      // console.log(`${key} :: ${this.state[key]}`);
      await set(key, this.state[key], this.store);
    }
  },

  /**
   * Lookup player by ID (key)
   * @param {number} id 
   */
  getPlayer(id) { return this.state.players[id] },

  /**
   * Get all players
   */
  getPlayers() { return this.state.players },

  /**
   * Get the currently active player
   */
  getCurrentPlayer() {
    return this.getPlayer(this.state.currentPlayerId);
  },

  /**
   * set default player state for given id
   * @param {number} id 
   * @param {string} title 
   * @param {boolean} isNPC 
   */
  newPlayer(id, title, isNPC) {
    // Create new player record
    this.state.players[id] = Object.assign({ id, title, isNPC }, this.defaultPlayerState);
    // add new player to the active players list
    this.state.activePlayers.push(id);
  },

  /**
   * reset gameplay variables for each player and set the current player ID to the first in the list
   */
  newGame() {
    this.state.activePlayers.forEach(id => this._resetPlayer(id));
    this.state.currentPlayerId = this.state.activePlayers[0];
  },

  /**
   * Start a new round within the same game. reset all game vars per player except 'bank'
   */
  newRound() {
    this.state.activePlayers.forEach(id => this._resetPlayer(id, "bank"));
    this.state.currentPlayerId = this.state.activePlayers[0];
    this._startTurn(this.state.currentPlayerId);
  },

  /**
   * reset properties that are bound to a single round of play
   * @param {number} id 
   * @param  {...string} omit 
   */
  _resetPlayer(id, ...omit) {
    const props = ["bet", "bank", "handValue", "hasBlackjack", "isBusted", "isFinished", "isStaying", "lastAction", "status", "turn"];
    props.forEach(prop => {
      if (!(prop in omit)) {
        this.state.players[id][prop] = this.defaultPlayerState[prop]
      }
    });
  },

  /**
   * set the given player as having started their turn 
   * @param {number} id 
   */
  _startTurn(id) {
    let p = this.getPlayer(id);
    p.turn = true;
    p.isFinished = false;
    p.lastAction = "startTurn";
    console.log(`${p.title} started turn`);
  },

  /**
   * cause the given player to bet the given amount (unused)
   * @param {number} id 
   * @param {number} amount 
   */
  _bet(id, amount) {
    let p = this.getPlayer(id);
    p.pot -= amount;
    p.bet = amount;
    p.lastAction = "bet";
    debugger;
    console.log(`${p.title} bet ${amount}`);
  },

  /**
   * cause the given player to ante the given amount
   * @param {number} id 
   * @param {number} amount 
   */
  _ante(id, amount) {
    let p = this.getPlayer(id);
    p.bank -= amount;
    p.lastAction = "ante";
    console.log(`${p.title} ante ${amount}`);
  },

  /**
   * cause all players to ante
   * @param {number} amount 
   */
  _allPlayersAnte(amount) {
    this.state.activePlayers.forEach(
      id => this._ante(this.state.players[id], amount)
    )
  },

  /**
   * cause the given player to hit
   * @param {number} id 
   */
  _hit(id) {
    let p = this.getPlayer(id);
    p.lastAction = "hit";
    console.log(`${p.title} hit`);
  },

  // cause the given player to become busted
  /**
   * 
   * @param {*} id the id of the player to fetch
   */
  _bust(id) {
    let p = this.getPlayer(id);
    p.isBusted = true;
    this._finish(id);
    console.log(`${p.title} busted`);
  },

  /**
   * cause the given player to stay
   * @param {number} id 
   */
  _stay(id) {
    let p = this.getPlayer(id);
    p.isStaying = true;
    p.lastAction = "stay";
    this._finish(id);
    console.log(`${p.title} stayed`);
  },

  /**
   * when finished, the player can not perform any further actions
   * @param {number} id 
   */
  _finish(id) {
    let p = this.getPlayer(id);
    p.isFinished = true;
    this._endTurn(id);
    console.log(`${p.title} finished`);
  },

  /**
   * cause all players to finish
   */
  _allPlayersFinish() {
    this.state.activePlayers.forEach(
      id => this._finish(this.state.players[id])
    )
  },

  /**
   * cause the given player to have blackjack
   * @param {number} id 
   */
  _blackjack(id) {
    let p = this.getPlayer(id);
    p.hasBlackjack = true;
    console.log(`${p.title} has blackjack`);
  },

  /**
   * cause the given player to start their turn
   * @param {number} id 
   */
  _startTurn(id) {
    let p = this.getPlayer(id);
    p.turn = true;
    p.isFinished = false;
    p.lastAction = "startTurn";
    console.log(`${p.title} started turn`);
  },

  /**
   * cause the given player's turn to end
   * @param {number} id 
   */
  _endTurn(id) {
    let p = this.getPlayer(id);
    p.turn = false;
    p.lastAction = "endTurn";
    console.log(`${p.title} ended turn`);
  },

  /**
   * cycle CurrentPlayerId
   */
  _nextPlayer() {
    // get id of current Player from state
    let id = this.state.currentPlayerId;

    // get index of current player in the activePlayers list
    let index = this.state.activePlayers.findIndex(id);

    // increment the index or go back to 0
    let nextIndex = index + 1 >= (this.state.activePlayers.length)
      ? 0
      : index + 1;
    this.currentPlayer.startTurn();
  },

  /**
   * calculate status for the given player
   * @param {number} id 
   */
  _setStatus(id) {
    let p = this.getPlayer(id);

    /*   set busted status  */
    if (p.handValue.aceAsOne > 21 && p.handValue.aceAsEleven > 21) {
      this._bust(id);

    } else if (
      /*   set blackjack status  */
      p.handValue.aceAsOne === 21 ||
      p.handValue.aceAsEleven === 21
    ) {
      this._blackjack(id);
    }
  },

  /**
   * return the highest possible hand value for the given player
   * @param {number} id 
   */
  _getHigherHandValue(id) {
    let p = this.getPlayer(id);

    let higherHandValue = p.handValue.aceAsOne > p.handValue.aceAsEleven
      ? p.handValue.aceAsOne
      : p.handValue.aceAsEleven;
    return higherHandValue;
  },

  /**
   * add the given amount to the given player's bank
   * @param {number} id 
   * @param {number} amount 
   */
  _payout(id, amount) {
    let p = this.getPlayer(id);
    p.bank += amount;
  }

});


/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      PlayerStore1.initialize().then(() => {
        console.timeEnd(`PlayerStore#initialize()`);
        PlayerStore1.emitChange();
      });
      break;

    case AppConstants.GAME_NEWPLAYER:
      PlayerStore1.newPlayer(action.id, action.title, action.isNPC);
      PlayerStore1.emitChange();
      break;

    case AppConstants.GAME_RESET:
      PlayerStore1.newGame();
      PlayerStore1.emitChange();
      break;

    case AppConstants.GAME_NEWROUND:
      PlayerStore1.newRound();
      PlayerStore1.emitChange();
      break;



    default:
      // do nothing
      break;
  }
});

/*  ========================================================  */