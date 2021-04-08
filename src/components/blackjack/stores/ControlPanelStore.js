import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* idb-keyval */
// import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';
import { createStore, get, set } from 'idb-keyval';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  // browser cache
  store: createStore('ControlPanelStore', 'State'),

  // in-memory state 
  state: {
    isCardDescVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isOptionsPanelVisible: false,
    isSelectedVisible: false,
    isActivityLogVisible: false,
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

  async initialize() {
    console.time(`ControlPanelStore#initialize()`);
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
    // console.log(`ControlPanelStore#saveAll`);
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
      ControlPanelStore.initialize().then(() => {
        console.timeEnd(`ControlPanelStore#initialize()`);
        ControlPanelStore.emitChange();
      });
      break;

    case AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL:
      ControlPanelStore.state.isOptionsPanelVisible = false;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL:
      ControlPanelStore.state.isOptionsPanelVisible = true;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY:
      ControlPanelStore.state.isDeckVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY:
      ControlPanelStore.state.isDrawnVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY:
      ControlPanelStore.state.isSelectedVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY:
      ControlPanelStore.state.isHandValueVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY:
      ControlPanelStore.state.isDealerHandVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLECARDTITLEVISIBILITY:
      ControlPanelStore.state.isCardDescVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEACTIVITYLOGVISIBILITY:
      ControlPanelStore.state.isActivityLogVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default ControlPanelStore;
