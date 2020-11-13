import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
// import { Store, get, set } from 'idb-keyval';

import GameStore from './GameStore';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "activityLog";
const ActivityLogStore = Object.assign({}, EventEmitter.prototype, {
  store: new Store('ActivityLogStore', 'ActivityItems'),
  state: {
    activityItems: [],
    nextKey: 2,
  },
  getState() { return this.state },
  emitChange() { this.emit(CHANGE_EVENT); this.saveAll(); },
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },
  new(itemProps) {
    const newItem = { ...itemProps, key: this.state.nextKey, timestamp: new Date(), };
    this.state.activityItems.push(newItem);
    this.state.nextKey++;
    // console.log(`ActivityLogStore#new:${JSON.stringify(newItem)}`);
    this.emitChange();
  },
  clear() { this.state.activityItems = [] },
  async initialize() {
    let storedState = await get('state', this.store);
    if (storedState) { this.state = storedState }
    this.emitChange();
  },
  async saveAll() {
    await set('state', this.state, this.store);
    // console.log('ActivityLogStore#saveAll');
  }
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
        iconName: "Add",
      });
      break;

    case AppConstants.GAME_STAY:
      ActivityLogStore.new({
        description: " stayed",
        name: GameStore.getPlayerName(action.playerId),
        iconName: "Forward",
      });
      break;

    case AppConstants.GAME_BET:
      ActivityLogStore.new({
        description: ` bet $${action.amount}`,
        name: GameStore.getPlayerName(action.playerId),
        iconName: "Money",
      });
      break;

    case AppConstants.DECK_HIT:
      ActivityLogStore.new({
        description: ` hit`,
        name: GameStore.getPlayerName(action.playerId),
        iconName: "ChevronDownMed",
      });
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default ActivityLogStore;
