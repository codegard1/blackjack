import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
// import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { createStore, get, set } from 'idb-keyval';

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "playerstats";
const StatsStore = Object.assign({}, EventEmitter.prototype, {

  // IDB Store holds state
  store: createStore('StatsStore', 'State'),

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
  emitChange() { this.emit(CHANGE_EVENT); },

  // subscribe to this store
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  // return stats for the given player
  async getStats(playerKey) { if (playerKey) return get(playerKey, this.store) },

  // return the win/loss ratio as a string
  calculateWinLossRatio(gamesWon, gamesLost) {
    const numerator = gamesWon > 0 ? gamesWon : 1;
    const denominator = gamesLost > 0 ? gamesLost : 1;
    const ratio = (numerator / denominator).toString();
    return ratio.substr(0, 4);
  },

  // update stats for a given player
  async update(playerKey, statsFrame) {
    let stats = await this.getStats(playerKey);
    if (stats) {
      for (let key in statsFrame) {
        /* add the value of stasFrame[key] to the corresponding key in statsstore */
        if (stats.hasOwnProperty(key)) {
          stats[key] += statsFrame[key];
        }
      }
      /* recalculate win/loss ratio */
      stats.winLossRatio = this.calculateWinLossRatio(stats.numberOfGamesWon, stats.numberOfGamesLost);
      // save the new value
      await set(playerKey, stats, this.store);

      // console.log(`Updated stats for player #${playerKey}`);
      this.emitChange();
    }
  },

  /**
   * Start tracking a new player, or get an existing player's stats from IDB
   * @param {string} playerKey 
   */
  async new(playerKey) {
    // get saved data from IDB
    const stats = await get(playerKey, this.store)
    // if saved data does not exist, create a new entry with defaults
    if (!stats) {
      await set(playerKey, this.defaultStats, this.store);
    }
  },
});

/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      // console.log(`placeholder for initialize_stores`)
      break;

    case AppConstants.GLOBAL_NEWPLAYER:
      StatsStore.new(action.key).then(() => StatsStore.emitChange());
      break;

    // redundant because GameStore calls StatsStore.update() directly
    case AppConstants.STATS_UPDATE:
      StatsStore.update(action.key, action.statsFrame);
      StatsStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

export default StatsStore;
