import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import { defaultPlayers, defaultSelectedPlayerKey } from "../definitions";

import { get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';

/* state variables */
let state = {
  isCardDescVisible: false,
  isDealerHandVisible: false,
  isDeckVisible: false,
  isDrawnVisible: false,
  isHandValueVisible: false,
  isSelectedVisible: false,
  players: defaultPlayers,
  selectedPlayerKey: defaultSelectedPlayerKey,
};

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "IDBStore";
const IDBStore = Object.assign({}, EventEmitter.prototype, {
  getState: function () {
    return state;
  },
  fetch: function (key) {
    return state[key];
  },
  emitChange: function () {
    this.emit(CHANGE_EVENT);
    console.log('IDBStore.emitChange()');
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },
  // Check for saved player data
  async getSavedData() {

    // Get IDB values
    let players = await get('players');
    let selectedPlayerKey = await get('selectedPlayerKey');
    let isCardDescVisible = await get('isCardDescVisible');
    let isDealerHandVisible = await get('isDealerHandVisible');
    let isDeckVisible = await get('isDeckVisible');
    let isDrawnVisible = await get('isDrawnVisible');
    let isHandValueVisible = await get('isHandValueVisible');
    let isSelectedVisible = await get('isSelectedVisible');

    // Log IDB Values
    console.log(`players: ${JSON.stringify(players)}`);
    console.log(`selectedPlayerKey: ${selectedPlayerKey}`);
    console.log(`isCardDescVisible: ${isCardDescVisible}`);
    console.log(`isDealerHandVisible: ${isDealerHandVisible}`);
    console.log(`isDeckVisible: ${isDeckVisible}`);
    console.log(`isDrawnVisible: ${isDrawnVisible}`);
    console.log(`isHandValueVisible: ${isHandValueVisible}`);
    console.log(`isSelectedVisible: ${isSelectedVisible}`);

    // If no saved data is located
    if (players) { state.players = players }
    if (selectedPlayerKey) { state.selectedPlayerKey = selectedPlayerKey }
    if (isCardDescVisible) { state.isCardDescVisible = isCardDescVisible }
    if (isDealerHandVisible) { state.isDealerHandVisible = isDealerHandVisible }
    if (isDeckVisible) { state.isDeckVisible = isDeckVisible }
    if (isDrawnVisible) { state.isDrawnVisible = isDrawnVisible }
    if (isHandValueVisible) { state.isHandValueVisible = isHandValueVisible }
    if (isSelectedVisible) { state.isSelectedVisible = isSelectedVisible }

    // Emit change to update the UI
    this.emitChange();
  },
  async updateSavedData(...keys) {
    keys.forEach(key => {
      set(key, state[key])
        .then(() => console.log(`updated '${key}'`))
        .catch(reason => console.log(`failed to update '${key}: ${reason}`));
    });
  }
});

// Load saved data from IDB if it exists
IDBStore.getSavedData();

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {
  /* report for debugging */
  //const now = new Date().toTimeString();
  //console.log(`  - ${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.IDB_FETCH:
      IDBStore.fetch(action.key);
      break;

    case AppConstants.IDB_SAVE:
      IDBStore.state[action.key] = action.payload;
      IDBStore.updateSavedData(action.key);
      IDBStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default IDBStore;
