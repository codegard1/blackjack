import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

import { log } from "../utils";

/* state variables */
let state = {
  isDeckVisible: true,
  isDrawnVisible: true,
  isSelectedVisible: true,
  isOptionsPanelVisible: false,
  isMessageBarVisible: false,
  messageBarDefinition: {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  }
};

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "controlPanel";
export const ControlPanelStore = Object.assign({}, EventEmitter.prototype, {
  getState: function () {
    return state;
  },
  /* This is redundant with AppActions.showMessageBar */
  setMessageBar: function (text, type) {
    _showMessageBar(text, type);
    this.emitChange(CHANGE_EVENT);
  },
  emitChange: function () {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function (callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function (callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {
  /* report for debugging */
  const now = new Date().toTimeString();
  log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL:
      _hideOptionsPanel();
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL:
      _showOptionsPanel();
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_SHOWMESSAGEBAR:
      _showMessageBar(action.text, action.type);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY:
      _toggleDeckVisibility(action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY:
      _toggleDrawnVisibility(action.bool);
      ControlPanelStore.emitChange();
      break;

    case AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY:
      _toggleSelectedVisibility(action.bool);
      ControlPanelStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

/* method definitions */
function _hideOptionsPanel() {
  state.isOptionsPanelVisible = false;
}

function _showOptionsPanel() {
  state.isOptionsPanelVisible = true;
}

function _showMessageBar(text, type = MessageBarType.info) {
  state.messageBarDefinition = {
    text,
    type,
    isMultiLine: state.messageBarDefinition.isMultiLine
  };
  state.isMessageBarVisible = true;
}

function _toggleDeckVisibility(bool) {
  state.isDeckVisible = bool;
}

function _toggleDrawnVisibility(bool) {
  state.isDrawnVisible = bool;
}

function _toggleSelectedVisibility(bool) {
  state.isSelectedVisible = bool;
}

export default ControlPanelStore;
