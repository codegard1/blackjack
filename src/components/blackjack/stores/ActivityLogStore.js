import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
// import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { Store, get, set } from 'idb-keyval';

import PlayerStore from './PlayerStore';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "activityLog";
const ActivityLogStore = Object.assign({}, EventEmitter.prototype, {
  // browser cache
  store: new Store('ActivityLogStore', 'State'),

  // in-memory state 
  state: {
    activityItems: [],
    nextKey: 1,
  },

  // return state to a subscriber
  getState() { return this.state },

  // notify subscribers of a state change and save state to local storage
  emitChange() {
    this.emit(CHANGE_EVENT);
    this.saveAll();
  },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  // create a new ActivityItem
  new(itemProps) {
    const newItem = {
      ...itemProps,
      key: this.state.nextKey,
      timestamp: new Date(),
    };
    this.state.activityItems.push(newItem);
    // sort items in reverse chronological order
    this.state.activityItems.sort((a, b) => b.timestamp - a.timestamp);
    this.state.nextKey++;
    this.emitChange();
  },

  // clear state 
  clear() {
    this.state.activityItems = [];
    this.emitChange();
  },

  // Load data from local storage, if available
  // ideally this should be in the constructor
  async initialize() {
    console.time(`ActivityLogStore#initialize()`);
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
    // console.log(`ActivityLogStore#saveAll`);
    for (let key in this.state) {
      // console.log(`${key} :: ${this.state[key]}`);
      await set(key, this.state[key], this.store);
    }
  },
});

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      ActivityLogStore.initialize().then(() => {
        console.timeEnd(`ActivityLogStore#initialize()`);
        ActivityLogStore.emitChange();
      })
      break;

    case AppConstants.ACTIVITYLOG_NEW:
      ActivityLogStore.new({
        description: action.description,
        name: action.name,
        iconName: action.iconName,
      });
      break;

    case AppConstants.GAME_NEWROUND:
      ActivityLogStore.new({
        description: "New Round Started",
        name: "",
        iconName: "SyncOccurence",
      });
      break;

    case AppConstants.GAME_STAY:
      ActivityLogStore.new({
        description: "stayed",
        name: PlayerStore.getPlayerName(action.playerKey),
        iconName: "HandsFree",
      });
      break;

    case AppConstants.GAME_BET:
      ActivityLogStore.new({
        description: `bet $${action.amount}`,
        name: PlayerStore.getPlayerName(action.playerKey),
        iconName: "Money",
      });
      break;

    case AppConstants.DECK_HIT:
      ActivityLogStore.new({
        description: `hit`,
        name: PlayerStore.getPlayerName(action.playerKey),
        iconName: "CheckedOutByOther12",
      });
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default ActivityLogStore;
