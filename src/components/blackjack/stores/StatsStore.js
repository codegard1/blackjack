import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* IndexedDB State Manager */
import { State } from '../../../lib/State';

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "playerstats";
const StatsStore = Object.assign({}, EventEmitter.prototype, {
  // default state
  state: {},

  // IndexedDB 
  stateManager: new State(["StatsStore"], (name, value) => {
    console.log(`${name} was updated`);
  }),

  // default value of stats for each player
  defaultStats: {
    numberOfGamesLost: 0,
    numberOfGamesPlayed: 0,
    numberOfGamesWon: 0,
    numberOfTimesBlackjack: 0,
    numberOfTimesBusted: 0,
    totalWinnings: 0,
    winLossRatio: "1",
  },

  // tell subscribers that a change has occurred in state
  emitChange() { this.emit(CHANGE_EVENT); this.saveAll(); },

  // subscribe to this store
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  // return stats for the given player
  async getStats(playerKey) { return this.state[playerKey] || false },

  // return the win/loss ratio as a string
  calculateWinLossRatio(gamesWon, gamesLost) {
    const numerator = gamesWon > 0 ? gamesWon : 1;
    const denominator = gamesLost > 0 ? gamesLost : 1;
    const ratio = (numerator / denominator).toString();
    return ratio.substr(0, 4);
  },

  // update stats for a given player
  async update(playerKey, statsFrame) {
    const stats = this.state[playerKey];
    if (stats) {
      for (const key in statsFrame) {
        /* add the value of stasFrame[key] to the corresponding key in statsstore */
        if (stats.hasOwnProperty(key)) stats[key] += statsFrame[key];
      }
      /* recalculate win/loss ratio */
      stats.winLossRatio = this.calculateWinLossRatio(stats.numberOfGamesWon, stats.numberOfGamesLost);
    }
  },

  /**
   * Start tracking a new player, or get an existing player's stats from IDB
   * @param {string} playerKey 
   */
  new(playerKey) {
    // if saved data does not exist, create a new entry with defaults
    if (!this.state.hasOwnProperty(playerKey)) {
      this.state[playerKey] = this.defaultStats;
    }
  },

  // Load data from local storage, if available
  // ideally this should be in the constructor
  async initialize() {
    this.state = await this.stateManager.get("StatsStore") || this.state;
  },

  // save state to local storage
  async saveAll() {
    this.stateManager.set("StatsStore", this.state);
  },
});

/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      StatsStore.initialize().then(() => {
        StatsStore.emitChange();
      })
      break;

    case AppConstants.GLOBAL_NEWPLAYER:
      StatsStore.new(action.key);
      StatsStore.emitChange();
      break;

    // redundant because GameStore calls StatsStore.update() directly
    case AppConstants.STATS_UPDATE:
      StatsStore.update(action.key, action.statsFrame).then(() => {
        StatsStore.emitChange();
      });
      break;

    default:
      /* do nothing */
      break;
  }
});

export default StatsStore;
