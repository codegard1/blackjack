import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';

import GameStore from './GameStore';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "activityLog";
const ActivityLogStore = Object.assign({}, EventEmitter.prototype, {
  // in-memory state 
  state: {
    activityItems: [],
    nextKey: 1,
  },

  // locally-stored state
  store: new Store('ActivityLogStore', 'State'),

  // return state 
  getState() { return this.state },

  // notify subscribers of a state change and save state to local storage
  emitChange() {
    this.emit(CHANGE_EVENT);
    this.saveAll();
  },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe to this store
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
    this.state.activityItems.sort((a,b)=>b.timestamp-a.timestamp);
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
    let storedState = await get('state', this.store);
    if (storedState) { 
      this.state = storedState 
      this.emitChange();
    }
  },

  // save state to local storage
  async saveAll() { set('state', this.state, this.store) },
});

ActivityLogStore.initialize();

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
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
        name: GameStore.getPlayerName(action.playerId),
        iconName: "HandsFree",
      });
      break;

    case AppConstants.GAME_BET:
      ActivityLogStore.new({
        description: `bet $${action.amount}`,
        name: GameStore.getPlayerName(action.playerId),
        iconName: "Money",
      });
      break;

    case AppConstants.DECK_HIT:
      ActivityLogStore.new({
        description: `hit`,
        name: GameStore.getPlayerName(action.playerId),
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
