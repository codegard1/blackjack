import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { Store, get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  // browser cache
  store: new Store('ControlPanelStore', 'State'),

  // in-memory state 
  state: {
    isCardDescVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isMessageBarVisible: false,
    isOptionsPanelVisible: false,
    isSelectedVisible: false,
    players: [
      { id: 1, title: "Chris", isNPC: false },
      { id: 2, title: "Dealer", isNPC: true },
      { id: 3, title: "John", isNPC: true },
    ],
    selectedPlayerKey: "chris",
    newPlayerFieldValue: "",
    isNewPlayerFieldEmpty: true,
    isNewPlayerSaveButtonDisabled: false,
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
    console.time(`initializing ControlPanelStore`);
    for (let key in this.state) {
      let val = await get(key, this.store)
      if (val) { this.state[key] = val }
    }
  },

  // save state to local storage
  async saveAll() {
    for (let key in this.state) {
      await set(key, this.state[key], this.store);
    }
  }
});

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      ControlPanelStore.initialize();
      console.timeEnd(`initializing ControlPanelStore`);
      ControlPanelStore.emitChange();
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

    case AppConstants.CONTROLPANEL_SELECTPLAYER:
      ControlPanelStore.state.selectedPlayerKey = action.key;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEACTIVITYLOGVISIBILITY:
      ControlPanelStore.state.isActivityLogVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    // Add a new player to the players array
    case AppConstants.CONTROLPANEL_NEWPLAYER:
      const lastIndex = ControlPanelStore.state.players.length - 1
      const newPlayerId = ControlPanelStore.state.players[lastIndex].id + 1;
      ControlPanelStore.state.players.push({
        id: newPlayerId,
        title: action.name,
        isNPC: false
      });
      ControlPanelStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

export default ControlPanelStore;
