import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* IndexedDB State Manager */
import { State } from '../../../lib/State';

import PlayerStore from './PlayerStore';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "activityLog";
const STORE_NAME = "ActivityLogStore";
const ActivityLogStore = Object.assign({}, EventEmitter.prototype, {
  // in-memory (default) state 
  state: {
    activityItems: [],
    nextKey: 1,
  },

  /* IndexedDB */
  stateManager: new State([STORE_NAME], (name, value) => {
    console.log(`${name} was updated`);
  }),


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
    this.state = await this.stateManager.get(STORE_NAME) || this.state;
  },
  
  // save state to local storage
  async saveAll() {
    this.stateManager.set(STORE_NAME, this.state);
  },
});

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      ActivityLogStore.initialize().then(() => {
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

    case AppConstants.CLEAR_STORES:
      ActivityLogStore.clear();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default ActivityLogStore;
