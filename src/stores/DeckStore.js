import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import Shuffle, { PlayingCard } from "shuffle";
import { log } from "../utils";

/* state variables */
let drawn = [], selected = [], deck = [];

/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "deck";
export const DeckStore = Object.assign({}, EventEmitter.prototype, {
  getDeck: function() {
    return deck;
  },
  getSelected: function() {
    return selected;
  },
  getDrawn: function() {
    return drawn;
  },
  getState: function() {
    return { deck, selected, drawn };
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

/*  ========================================================  */
/* register method */
AppDispatcher.register(action => {
  /* report for debugging */
  const now = new Date().toTimeString();
  log(`${action.actionType} was called at ${now}`);

  switch (action.actionType) {
    case AppConstants.DECK_NEWDECK:
      _newDeck();
      DeckStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

/*  ========================================================  */

/* method definitions */
function _newDeck() {
  deck = Shuffle.shuffle();
  selected = [];
  drawn = [];
}

export default DeckStore;
