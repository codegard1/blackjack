import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
// import { Store, get, set, clear } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { Store, get, set, clear } from 'idb-keyval';

// custom stuff
import DeckStore from "./DeckStore";
import { defaultPlayersObj, } from "../definitions";

const CHANGE_EVENT = "playerStore";
const PlayerStore = Object.assign({}, EventEmitter.prototype, {

  // cached state
  store: new Store('PlayerStore', 'State'),

  // in-memory state
  state: {
    // players: {},
    players: defaultPlayersObj,
    activePlayers: [],
    currentPlayerKey: undefined,
    lastWriteTime: undefined,
  },

  // Default values for a player record
  defaultPlayerState: {
    // id: undefined,
    // key: undefined,
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
    let val = await get("players", this.store);
    this.state.players = (val !== undefined) ? val : defaultPlayersObj;
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
   * 
   */
  async clearStore() {
    await clear(this.store);
  },

  /**
   * Lookup player by key
   * @param {string} key
   */
  getPlayer(key) { return this.state.players[key] },

  /**
   * Get all players
   */
  getPlayers() { 
    return this.state.activePlayers.map(key => this.state.players[key]);
  },

  /**
   * Get the currently active player
   */
  getCurrentPlayer() {
    return this.getPlayer(this.state.currentPlayerKey);
  },

  /**
   * Return the name of the given player
   * @param {string} key key of the player to look up
   */
  getPlayerName(key) {
    let p = this.getPlayer(key);
    return p.title;
  },

  /**
   * Return the number of active players
   * @returns {number}
   */
  length() {
    return this.state.activePlayers.length
  },

  /**
   * set default player state for given key
   * @param {string} key
   * @param {string} title 
   * @param {boolean} isNPC 
   */
  newPlayer(key, title, isNPC) {
    // Create new player record
    this.state.players[key] = Object.assign({ key, title, isNPC }, this.defaultPlayerState);
    // add new player to the active players list
    this.state.activePlayers.push(key);
  },

  /**
   * set players' status, hand values
   */
  _evaluatePlayers() {
    this.state.activePlayers.forEach(key => {
      this.state.players[key].handValue = DeckStore.getHandValue(key);
      this._setStatus(key);
    });
  },

  /**
   * reset gameplay variables for each player and set the current player key to the first in the list
   */
  reset() {
    this.state.activePlayers.forEach(key => this._resetPlayer(key));
    this.state.currentPlayerKey = this.state.activePlayers[0];
  },

  /**
   * Start a new round within the same game. reset all game vars per player except 'bank'
   */
  newRound() {
    this.state.activePlayers.forEach(key => this._resetPlayer(key, "bank"));
    this.state.currentPlayerKey = this.state.activePlayers[0];
    this._allPlayersAnte();
    this._startTurn(this.state.currentPlayerKey);
  },

  /**
   * reset properties that are bound to a single round of play
   * @param {string} key
   * @param  {...string} omit properties to omit when resetting
   */
  _resetPlayer(key, ...omit) {
    const props = ["bet", "bank", "handValue", "hasBlackjack", "isBusted", "isFinished", "isStaying", "lastAction", "status", "turn"];
    props.forEach(prop => {
      if (!(prop in omit)) {
        this.state.players[key][prop] = this.defaultPlayerState[prop]
      }
    });
  },

  /**
   * cause the given player to bet the given amount (unused)
   * @param {string} key
   * @param {number} amount 
   */
  _bet(key, amount) {
    let p = this.getPlayer(key);
    p.pot -= amount;
    p.bet = amount;
    p.lastAction = "bet";
    console.log(`${p.title} bet ${amount}`);
  },

  /**
   * cause the given player to ante the given amount
   * @param {string} key
   * @param {number} amount 
   */
  _ante(key, amount) {
    let p = this.getPlayer(key);
    p.bank -= amount;
    p.lastAction = "ante";
    console.log(`${p.title} ante ${amount}`);
  },

  /**
   * cause all players to ante
   * @param {number} amount 
   */
  _allPlayersAnte(amount) {
    this.state.activePlayers.forEach(key => this._ante(key, amount))
  },

  /**
   * cause the given player to hit
   * @param {string} key
   */
  _hit(key) {
    let p = this.getPlayer(key);
    p.lastAction = "hit";
    console.log(`${p.title} hit`);
  },

  // cause the given player to become busted
  /**
   * 
   * @param {string} key the key of the player to fetch
   */
  _bust(key) {
    let p = this.getPlayer(key);
    p.isBusted = true;
    this._finish(key);
    console.log(`${p.title} busted`);
  },

  /**
   * cause the given player to stay
   * @param {string} key
   */
  _stay(key) {
    let p = this.getPlayer(key);
    p.isStaying = true;
    p.lastAction = "stay";
    this._finish(key);
    console.log(`${p.title} stayed`);
  },

  /**
   * when finished, the player can not perform any further actions
   * @param {string} key
   */
  _finish(key) {
    let p = this.getPlayer(key);
    p.isFinished = true;
    this._endTurn(key);
    console.log(`${p.title} finished`);
  },

  /**
   * cause all players to finish
   */
  _allPlayersFinish() {
    this.state.activePlayers.forEach(
      key => this._finish(this.state.players[key])
    )
  },

  /**
   * cause the given player to have blackjack
   * @param {string} key
   */
  _blackjack(key) {
    let p = this.getPlayer(key);
    p.hasBlackjack = true;
    console.log(`${p.title} has blackjack`);
  },

  /**
   * cause the given player to start their turn
   * @param {string} key
   */
  _startTurn(key) {
    let p = this.getPlayer(key);
    p.turn = true;
    p.isFinished = false;
    p.lastAction = "startTurn";
    console.log(`${p.title} started turn`);
  },

  /**
   * cause the given player's turn to end
   * @param {string} key
   */
  _endTurn(key) {
    let p = this.getPlayer(key);
    p.turn = false;
    p.lastAction = "endTurn";
    console.log(`${p.title} ended turn`);
  },

  /**
   * cycle currentPlayerKey
   */
  _nextPlayer() {
    // get key of current Player from state
    let key = this.state.currentPlayerKey;

    // get index of current player in the activePlayers list
    let index = this.state.activePlayers.findIndex(key);

    // increment the index or go back to 0
    let nextIndex = index + 1 >= (this.state.activePlayers.length)
      ? 0
      : index + 1;
    this.state.currentPlayerKey = this.state.activePlayers[nextIndex];
    this._startTurn(this.state.currentPlayerKey);
  },

  /**
   * calculate status for the given player
   * @param {string} key
   */
  _setStatus(key) {
    let p = this.getPlayer(key);

    /*   set busted status  */
    if (p.handValue.aceAsOne > 21 && p.handValue.aceAsEleven > 21) {
      this._bust(key);

    } else if (
      /*   set blackjack status  */
      p.handValue.aceAsOne === 21 ||
      p.handValue.aceAsEleven === 21
    ) {
      this._blackjack(key);
    }
  },

  /**
   * return the highest possible hand value for the given player
   * @param {string} key
   */
  _getHigherHandValue(key) {
    let p = this.getPlayer(key);

    let higherHandValue = p.handValue.aceAsOne > p.handValue.aceAsEleven
      ? p.handValue.aceAsOne
      : p.handValue.aceAsEleven;
    return higherHandValue;
  },

  /**
   * add the given amount to the given player's bank
   * @param {string} key
   * @param {number} amount 
   */
  _payout(key, amount) {
    let p = this.getPlayer(key);
    p.bank += amount;
  },

  // return true if the current player is an NPC
  _isCurrentPlayerNPC() {
    let p = this.getCurrentPlayer();
    return p.isNPC;
  },

});


/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      PlayerStore.initialize().then(() => {
        console.timeEnd(`PlayerStore#initialize()`);
        PlayerStore.emitChange();
      });
      break;

    case AppConstants.CLEAR_STORES:
      PlayerStore.clearStore();
      break;

    case AppConstants.GLOBAL_NEWPLAYER:
      PlayerStore.newPlayer(action.key, action.title, action.isNPC);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_RESET:
      PlayerStore.reset();
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_NEWROUND:
      PlayerStore.newRound();
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_DEAL:
      PlayerStore._startTurn(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      PlayerStore._hit(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      PlayerStore._stay(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_BET:
      PlayerStore._bet(PlayerStore.state.currentPlayerKey, action.amount);
      PlayerStore.emitChange();
      break;

    case AppConstants.GLOBAL_EVALUATEGAME:
      PlayerStore._evaluatePlayers();
      PlayerStore.emitChange();
      break;

    case AppConstants.GLOBAL_ENDGAME:
      PlayerStore._allPlayersFinish();
      PlayerStore.emitChange();
      break;


    default:
      // do nothing
      break;
  }
});

/*  ========================================================  */

export default PlayerStore;