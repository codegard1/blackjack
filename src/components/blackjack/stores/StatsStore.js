import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';

/* New instance of PlayerStats created for each player */
class PlayerStats {
  constructor(id, preset) {
    this.id = id;
    // Use the preset value if present, otherwise use defaults
    this.state = preset ? preset :{
      numberOfGamesLost: 0,
      numberOfGamesPlayed: 0,
      numberOfGamesWon: 0,
      numberOfTimesBlackjack: 0,
      numberOfTimesBusted: 0,
      winLossRatio: "1"
    };
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
let state = [];

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "playerstats";
const StatsStore = Object.assign({}, EventEmitter.prototype, {
  emitChange() { this.emit(CHANGE_EVENT); },
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },
  getState() { return state },
  store: new Store('Blackjack', 'StatsStore'),
  getStats(playerId) {
    const index = state.findIndex(item => item.id === playerId);
    if(index !== -1){
      const stats = state[index].state;
      return stats;
    } else {
      return false;
    }
  },
  async update(playerId, statsFrame) {
    const index = state.findIndex(item => item.id === playerId);
    debugger;
    for (let key in statsFrame) {
      /* if the key in statsFrame === true, ++1 it */
      if (statsFrame[key] && state[index].state.hasOwnProperty(key)) {
        state[index].state[key] += 1;
      }
    }
    /* recalculate win/loss ratio */
    state[index].calculateWinLossRatio();
    await set(playerId, state[index].state, this.store);
    console.log(`Updated stats for player #${playerId}`);
    this.emitChange();
  },
  async new(playerId) {
    // get saved data from IDB
    const p = await get(playerId, this.store);
    // if saved data exists, use it as the base state for the PlayerStats object; otherwise use defaults
    if (p) {
      state.push(new PlayerStats(playerId, p));
      console.log(`loaded saved playerstats state for player #${playerId}`);
    } else {
      state.push(new PlayerStats(playerId));
      console.log(`using default playerstats state for player #${playerId}`);
    }
    this.emitChange();
  },
  // Save all PlayerStats. This method is unused. 
  async saveAll() {
    if (state.length > 0) {
      state.forEach(v => {
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
