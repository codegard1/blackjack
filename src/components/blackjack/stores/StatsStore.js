import { EventEmitter } from "events";

/* flux */
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
// import GameStore from "./GameStore";

/* New instance of PlayerStats created for each player */
class PlayerStats {
  constructor(id) {
    this.id = id;
    this.state = {
      numberOfGamesLost: 0,
      numberOfGamesPlayed: 0,
      numberOfGamesWon: 0,
      numberOfTimesBlackjack: 0,
      numberOfTimesBusted: 0,
      winLossRatio: "1"
    };
  }

  update(statsFrame) {
    /* for each key in statsframe, update the corresponding key in state */
    for (let key in statsFrame) {
      console.log(`${key}: ${statsFrame[key]}`);

      /* if this PlayerStats has the given key, ++1 it */
      if (this.state.hasOwnProperty(key)) {
        this.state[key] += 1;
        console.log(key, this.state[key]);
      }
    }

    /* recalculate win/loss ratio */
    this.calculateWinLossRatio();
  }

  calculateWinLossRatio() {
    const numerator =
      this.state.numberOfGamesWon > 0 ? this.state.numberOfGamesWon : 1;
    const denominator =
      this.state.numberOfGamesLost > 0 ? this.state.numberOfGamesLost : 1;
    const ratio = (numerator / denominator).toString();
    this.state.winLossRatio = ratio.substr(0, 4);
  }

  getState() {
    return this.state;
  }
}

/* State variables */
let state = { playerStats: [] };

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "playerstats";
const StatsStore = Object.assign({}, EventEmitter.prototype, {
  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },
  getState: function() {
    return state;
  },
  getStats(playerId) {
    const index = state.playerStats.findIndex(item => item.id === playerId);
    return state.playerStats[index].getState();
  },
  update(playerId, statsFrame) {
    const index = state.playerStats.findIndex(item => item.id === playerId);
    state.playerStats[index].update(statsFrame);
    this.emitChange();
  },
  new(playerId) {
    state.playerStats.push(new PlayerStats(playerId));
    this.emitChange();
  }
});

/* register methods */
AppDispatcher.register(action => {
  /* report for debugging */
  //const now = new Date().toTimeString();
  //log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.STATS_NEW:
      let newStats = new PlayerStats(action.playerId);
      state.playerStats.append(newStats);
      StatsStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

export default StatsStore;
