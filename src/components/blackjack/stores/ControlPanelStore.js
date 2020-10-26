import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import {get, set } from '../../../idb-keyval/idb-keyval-cjs-compat.min.js';

/* state variables */
let state = {
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
};
// let state1 = new Store('blackjack', 'controlPanelStore');

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  getState() { return state },
  emitChange() { this.emit(CHANGE_EVENT); this.saveAll() },
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },
  async initialize() {
    for (let key in state) {
      let val = await get(key);
      if (val) {
        state[key] = val;
        console.log(key, val);
        this.emitChange();
      } else {
        set(key, state[key]);
      }
    }
  },
  async saveAll() {
    for (let key in state) {
      await set(key, state[key]);
    }
  }
});

ControlPanelStore.initialize();

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL:
      state.isOptionsPanelVisible = false;
      set('isOptionsPanelVisible', false);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL:
      state.isOptionsPanelVisible = true;
      set('isOptionsPanelVisible', true);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY:
      state.isDeckVisible = action.bool;
      set('isDeckVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY:
      state.isDrawnVisible = action.bool;
      set('isDrawnVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY:
      state.isSelectedVisible = action.bool;
      set('isSelectedVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY:
      state.isHandValueVisible = action.bool;
      set('isHandValueVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY:
      state.isDealerHandVisible = action.bool;
      set('isDealerHandVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLECARDTITLEVISIBILITY:
      state.isCardDescVisible = action.bool;
      set('isCardDescVisible', action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SELECTPLAYER:
      state.selectedPlayerKey = action.key;
      set('selectedPlayerKey', action.key);
      ControlPanelStore.emitChange();
      break;

    // Add a new player to the players array
    case AppConstants.CONTROLPANEL_NEWPLAYER:
      const newPlayerId = (state.players[state.players.length - 1].id) + 1;
      state.players.push({
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
