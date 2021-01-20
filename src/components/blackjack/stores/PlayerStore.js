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


/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "player";
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
    isNPC: undefined,
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

  // return state to a subscriber
  getState() { return this.state },

  // notify subscribers of a state change
  emitChange() {
    this.emit(CHANGE_EVENT);
    this.saveAll();
  },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  // Load saved state from IDB, if available
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

  // save state to local storage
  async saveAll() {
    this.state.lastWriteTime = new Date().toISOString();
    console.log(`PlayerStore#saveAll`);
    for (let key in this.state) {
      // console.log(`${key} :: ${this.state[key]}`);
      await set(key, this.state[key], this.store);
    }
  },

  // Lookup player by ID (key)
  getPlayer(id) { return this.state.players[id] },

  // Get all players
  getPlayers() { return this.state.players },

  // set default player state for given id
  newPlayer(id, title, isNPC) {
    // Create new player record
    this.state.players[id] = Object.assign({ id, title, isNPC }, this.defaultPlayerState);
    // add new player to the active players list
    this.state.activePlayers.push(id);
  },

  // reset gameplay variables for each player
  // and set the current player ID to the first in the list
  newGame() {
    this.state.activePlayers.forEach(id => this.resetPlayer(id));
    this.state.currentPlayerId = this.state.activePlayers[0];
  },

  newRound() {
    this.state.activePlayers.forEach(id => this.resetPlayer(id, "bank"));
    this.state.currentPlayerId = this.state.activePlayers[0];
    this.startTurn(this.state.currentPlayerId);
  },

  // set the given player as having started their turn 
  startTurn(id) {
    let p = this.getPlayer(id);
    p.turn = true;
    p.isFinished = false;
    p.lastAction = "startTurn";
    console.log(`${p.title} started turn`);
  },

  // AKA NewRound; reset properties that are bound to a single round of play
  resetPlayer(id, ...omit) {
    const props = ["bet", "bank", "handValue", "hasBlackjack", "isBusted", "isFinished", "isStaying", "lastAction", "status", "turn"];
    props.forEach(prop => {
      if (!(prop in omit)) {
        this.state.players[id][prop] = this.defaultPlayerState[prop]
      }
    });
  },

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