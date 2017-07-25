import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/* "state" variables */
let _playersList = [];

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "change";
const GameStore = Object.assign({}, EventEmitter.prototype, {
  getAllPlayers: function() {
    return _playersList;
  },
  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
});

/* Responding to Actions */
AppDispatcher.register(action => {
  switch (action.actionType) {
    case AppConstants.GAME_NEWGAME:
      _newGame(action.players);
      GameStore.emitChange();
      break;

    default:
  }
});

/* Method implementations */
function _newGame(players) {
  players.forEach(player => {
    _playersList.push(player);
  });
  console.log("New Game", _playersList);
}
