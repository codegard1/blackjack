import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* Data, Getter method, Event Notifier */
let _gameList = [];
const CHANGE_EVENT = "change";
let GameStore = Object.assign({}, EventEmitter.prototype, {
  getAll: () => _gameList,
  emitChange: () => {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: callback => {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: callback => {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

/* Responding to Actions */
AppDispatcher.register(action => {
  switch (action.actionType) {
    
    case AppConstants.GAME_DEAL:
      _deal(action.data);
      GameStore.emitChange();
      break;

    default: 
  }
});

/* Method implementations */
function _deal() {
  console.log("dealt");
}
