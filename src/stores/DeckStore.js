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
  getDeck: function () {
    return deck;
  },
  getSelected: function () {
    return selected;
  },
  getDrawn: function () {
    return drawn;
  },
  getState: function () {
    return { deck, selected, drawn };
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
    case AppConstants.DECK_NEWDECK:
      _newDeck();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAW:
      _draw(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAWRANDOM:
      _drawRandom(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAWFROMBOTTOMOFDECK:
      _drawFromBottomOfDeck(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_RESET:
      _reset();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_SHUFFLE:
      _shuffle();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_PUTONBOTTOMOFDECK:
      _putOnBottomOfDeck(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_PUTONTOPOFDECK:
      _putOnTopOfDeck(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_REMOVESELECTEDFROMDRAWN:
      _removeSelectedFromDrawn(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_SELECT:
      _select(action.cardAttributes);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DESELECT:
      _deselect(action.cardAttributes);
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

function _drawFromBottomOfDeck(num) {
  const ret = deck.drawFromBottomOfDeck(num);
  drawn.push(ret);
  // log(`drawFromBottomOfDeck: ${ret}`);
}

function _drawRandom(num) {
  const ret = deck.drawRandom(num);
  drawn.push(ret);
  // log(`drawRandom: ${ret}`);
  return ret;
}

function _putOnTopOfDeck(cards = selected) {
  deck.putOnTopOfDeck(cards);
  _removeSelectedFromDrawn(cards);
  _clearSelected();
}

function _putOnBottomOfDeck(cards = selected) {
  deck.putOnBottomOfDeck(cards);
  _removeSelectedFromDrawn();
  _clearSelected();
}

function _reset() {
  deck.reset(); /* sets the deck back to a full 52-card deck, unshuffled */
}

function _draw(num) {
  const ret = deck.draw(num);
  drawn.push(ret);
  return ret;
}

function _shuffle() {
  deck.shuffle();
}

function _clearSelected() {
  selected = [];
}

function _removeSelectedFromDrawn(cards = selected) {
  cards.forEach(card => {
    const index = drawn.findIndex(element => {
      return element.suit === card.suit && card.sort === card.sort;
    });
    drawn.splice(index, 1);
  });
}

function _select(cardAttributes) {
  // log(cardAttributes);

  const selectedCard = new PlayingCard(
    cardAttributes.suit,
    cardAttributes.description,
    cardAttributes.sort
  );

  selected.push(selectedCard);
}

function _deselect(cardAttributes) {
  const toDelete = selected.filter(
    card =>
      card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
  );
  const index = selected.indexOf(toDelete);
  selected.splice(index, 1);
}

export default DeckStore;
