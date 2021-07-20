import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* IndexedDB State Manager */
import { State } from '../../../lib/State';

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
const STORE_NAME = "ControlPanelStore";
const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  // IndexedDB 
  stateManager: new State([STORE_NAME], (name, value) => {
    console.log(`${name} was updated`);
  }),

  // in-memory state 
  state: {
    isActivityLogVisible: false,
    isCardDescVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isSelectedVisible: false,
  },

  // return state to a subscriber
  getState() { return this.state },

  // notify subscribers of a state change and save state to local storage
  emitChange() { this.emit(CHANGE_EVENT); this.saveAll(); },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

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
      ControlPanelStore.initialize().then(() => {
        ControlPanelStore.emitChange();
      });
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
