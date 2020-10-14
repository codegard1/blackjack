import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import { defaultPlayers, defaultSelectedPlayerKey } from "../definitions";

import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

import { get, set } from 'idb-keyval';

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
  players: defaultPlayers,
  selectedPlayerKey: defaultSelectedPlayerKey,
  messageBarDefinition: {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  }
};

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  getState: function () {
    return state;
  },
  /* This is redundant with AppActions.showMessageBar */
  /* TO DO: move this to GameStore, since only GameStore uses it. */
  setMessageBar: function (text, type) {
    _showMessageBar(text, type);
    this.emitChange(CHANGE_EVENT);
  },
  emitChange: function () {
    this.emit(CHANGE_EVENT);
    console.log('ControlPanelStore.emitChange()');
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },
  // Check for saved player data
  async getSavedData() {

    let players = await get('players');
    let selectedPlayerKey = await get('selectedPlayerKey');

    console.log(`players: ${JSON.stringify(players)}`);
    console.log(`selectedPlayerKey: ${selectedPlayerKey}`);

    // If no saved data is located
    if (players === undefined) {
      // Set saved data from default 
      await set('players', defaultPlayers);
    } else {
      state.players = players
    }

    // If no saved data is located
    if (selectedPlayerKey === undefined) {
      // Set saved data from default 
      await set('selectedPlayerKey', defaultSelectedPlayerKey);
    } else {
      state.selectedPlayerKey = selectedPlayerKey;
    }
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
ControlPanelStore.getSavedData();

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {
  /* report for debugging */
  //const now = new Date().toTimeString();
  //console.log(`  - ${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL:
      state.isOptionsPanelVisible = false;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL:
      state.isOptionsPanelVisible = true;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWMESSAGEBAR:
      _showMessageBar(action.text, action.type);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_HIDEMESSAGEBAR:
      state.isMessageBarVisible = false;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY:
      state.isDeckVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY:
      state.isDrawnVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY:
      state.isSelectedVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY:
      state.isHandValueVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY:
      state.isDealerHandVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLECARDTITLEVISIBILITY:
      state.isCardDescVisible = action.bool;
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SELECTPLAYER:
      state.selectedPlayerKey = action.key;
      ControlPanelStore.updateSavedData("selectedPlayerKey");
      ControlPanelStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

/* method definitions */
function _showMessageBar(text, type = MessageBarType.info) {
  state.messageBarDefinition = {
    text,
    type,
    isMultiLine: state.messageBarDefinition.isMultiLine
  };
  state.isMessageBarVisible = true;
}

export default ControlPanelStore;
