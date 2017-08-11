import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import Shuffle from "shuffle";
import { log } from "../utils";
import { PlayerHand } from './PlayerHand';
import {PlayingCard} from './PlayingCard';

/* state variables */
let drawn = [], selected = [], deck = [], playerHands = [];
/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "deck";
export const DeckStore = Object.assign({}, EventEmitter.prototype, {
  getDeck: function () {
    return deck;
  },
  getSelected: function (playerId) {
    return selected.find(item => item.id === playerId);
  },
  getDrawn: function (playerId) {
    return drawn.find(item => item.id === playerId);
  },
  getHand: function (playerId) {
    const ret = playerHands.find(item => item.id === playerId);
    return ret.hand;
  },
  getHands: function () {
    return playerHands;
  },
  /* this is a cheat so that I can draw cards from GameStore */
  draw: function (num, id) {
    const index = playerHands.indexOf(playerHands.filter(player => player.id === id));
    const ret = _draw(num);
    if (playerHands[index]) { playerHands[index].push(ret) }
    return ret;
  },
  getHandValue: function (playerId) {
    if (playerHands.length > 0) {
      let index = playerHands.indexOf(playerHands.find(player => player.id === playerId));
      // console.log(`getHandValue: playerHands[index]`);
      return playerHands[index].evaluate();
    } else {
      return { aceAsOne: 0, AceAsEvelen: 0 }
    }
  },
  getState: function () {
    return { deck, selected, drawn, playerHands };
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

    case AppConstants.DECK_NEWPLAYERHAND:
      _newPlayerHand(action.id);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_CLEARHANDS:
      _clearHands();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_REMOVESELECTEDFROMPLAYERHAND:
      _removeSelectedFromPlayerHand(action.playerId, action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DEAL:
      _deal();
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
  if (ret.length) {
    ret.forEach(item => drawn.push(item));
  } else {
    drawn.push(ret);
  }
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
   log(cardAttributes);

  selected.push(
    new PlayingCard(
    cardAttributes.suit,
    cardAttributes.description,
    cardAttributes.sort
  ));
}

function _deselect(cardAttributes) {
  const toDelete = selected.filter(
    card =>
      card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
  );
  const index = selected.indexOf(toDelete);
  selected.splice(index, 1);
}

function _newPlayerHand(playerId) {
  const p = new PlayerHand(playerId);
  // console.log(`DeckStore::newPlayerHand ${JSON.stringify(p)}`);
  playerHands.push(new PlayerHand(playerId));
}

function _clearHands() {
  playerHands.forEach(hand => {
    hand.clear();
  });
}

function _removeSelectedFromPlayerHand(playerId, cards) {
  cards.forEach(card => {
    const index = playerHands.indexOf(playerHands.find(player => player.id === playerId));

    playerHands[index].findIndex(element => {
      return element.suit === card.suit && card.sort === card.sort;
    });
    playerHands[index].splice(index, 1);
  });
}

function _deal() {
  playerHands.forEach(player => {
    player.hand = _draw(2);
    player.evaluate();
    // console.log(`DeckStore::Deal  player ${player.id}'s hand: ${JSON.stringify(player.hand)}`);
  });
}

export default DeckStore;
