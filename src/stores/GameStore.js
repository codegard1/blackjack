import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";
import { log } from "../utils";

/* "state" variables */
let _playersList = [];
const playerDefaults = {
  id: 0,
  title: "No Name",
  hand: [],
  handValue: { aceAsOne: 0, aceAsEleven: 0 },
  status: "ok",
  turn: false,
  bank: 1000,
  bet: 0,
  lastAction: "none",
  isStaying: false
};

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
  /* report for debugging */
  const now = new Date().toTimeString();
  log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.GAME_NEWGAME:
      _newGame(action.players);
      GameStore.emitChange();
      break;

    default:
  }
});

//========================================================

/* Method implementations */
function _newGame(players) {
  players.forEach((playerTitle, index) => {
    _playersList.push(_newPlayer(playerTitle, index));
    console.log("_playersList", _playersList);
  });
}

//
function _newPlayer(title, index) {
  return {
    id: index + 1,
    title: title || playerDefaults.title,
    hand: playerDefaults.hand,
    handValue: playerDefaults.handValue,
    status: playerDefaults.status,
    turn: playerDefaults.turn,
    bank: playerDefaults.bank,
    bet: playerDefaults.bet,
    lastAction: playerDefaults.lastAction,
    isStaying: playerDefaults.isStaying
  };

  //this.setState({ players });
}
