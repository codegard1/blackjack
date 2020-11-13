import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
// import { Store, get, set } from 'idb-keyval';

/* New instance of PlayerStats created for each player */
class PlayerStats {
  constructor(id, preset) {
    this.id = id;

    // setup default  
    this.state = {
      numberOfGamesLost: 0,
      numberOfGamesPlayed: 0,
      numberOfGamesWon: 0,
      numberOfTimesBlackjack: 0,
      numberOfTimesBusted: 0,
      totalWinnings: 0,
      winLossRatio: "1",
    };

    // update state variables from preset, if present
    for (let key in preset) {
      try {
        this.state[key] = preset[key];
      } catch (error) {
        console.error(error);
      }
    }
  }

  calculateWinLossRatio() {
    const numerator =
      this.state.numberOfGamesWon > 0 ? this.state.numberOfGamesWon : 1;
    const denominator =
      this.state.numberOfGamesLost > 0 ? this.state.numberOfGamesLost : 1;
    const ratio = (numerator / denominator).toString();
    this.state.winLossRatio = ratio.substr(0, 4);
  }
}

/* State variables */
// let state = [];

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "playerstats";
const StatsStore = Object.assign({}, EventEmitter.prototype, {
  state:[],
  emitChange() { this.emit(CHANGE_EVENT); },
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },
  getState() { return this.state },
  store: new Store('StatsStore', 'Stats'),
  getStats(playerId) {
    const index = this.state.findIndex(item => item.id === playerId);
    if (index !== -1) {
      const stats = this.state[index].state;
      return stats;
    } else {
      return false;
    }
  },
  async update(playerId, statsFrame) {
    const index = this.state.findIndex(item => item.id === playerId);
    for (let key in statsFrame) {
      /* add the value of stasFrame[key] to the corresponding key in statsstore */
      if (statsFrame[key] && this.state[index].state.hasOwnProperty(key)) {
        this.state[index].state[key] += statsFrame[key];
      }
    }
    /* recalculate win/loss ratio */
    this.state[index].calculateWinLossRatio();
    await set(playerId, this.state[index].state, this.store);
    console.log(`Updated stats for player #${playerId}`);
    this.emitChange();
  },
  async new(playerId) {
    // get saved data from IDB
    const p = await get(playerId, this.store);
    // if saved data exists, use it as the base state for the PlayerStats object; otherwise use defaults
    if (p) {
      this.state.push(new PlayerStats(playerId, p));

      // console.log(`loaded saved playerstats state for player #${playerId}`);
    } else {
      this.state.push(new PlayerStats(playerId));
      // console.log(`using default playerstats state for player #${playerId}`);
    }
    this.emitChange();
  },
  // Save all PlayerStats. This method is unused. 
  async saveAll() {
    if (this.state.length > 0) {
      this.state.forEach(v => {
        set(v.id, v.state, this.store);
        console.log(`saved playerstats state for player #${v.id}`);
      });
    }
  },
});

/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.STATS_NEW:
      StatsStore.new(action.playerId);
      StatsStore.emitChange();
      break;

    case AppConstants.STATS_UPDATE:
      StatsStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

export default StatsStore;
