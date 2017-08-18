import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import { Shuffle } from "shuffle";
import { log } from "../utils";
import { PlayerHand } from './PlayerHand';
import { PlayingCard } from 'shuffle/lib/playingCard';

/* state variables */
let deck = [], drawn = [], selected = [], playerHands = [];
/*  ========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "deck";
export const DeckStore = Object.assign({}, EventEmitter.prototype, {
  getDeck: function () {
    return deck;
  },
  getSelected: function (playerId) {
    if (selected.length > 0) {
      let foundMatch = false;
      let foundCards = [];
      /* check each card in selected to see if it's in the current player's hand */
      selected.forEach(card => {
        const index = playerHands.findIndex(hand => hand.id === playerId);
        if (playerHands[index].hand.includes(card)) {
          foundMatch = true;
          foundCards.push(card);
        };
      });
      return (foundMatch && foundCards.length > 0) ? true : false;
    } else {
      return false;
    }
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

    case AppConstants.DECK_HIT:
      _hit(action.playerId);
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
  /* returns a new Deck populated with PlayingCards */
  deck = new Shuffle();
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
  if (num > 1) {
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
      return element.suit === card.suit && element.sort === card.sort;
    });
    drawn.splice(index, 1);
  });
}

function _select(cardAttributes) {
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
  playerHands.push(new PlayerHand(playerId));
}

function _clearHands() {
  playerHands.forEach(hand => {
    hand.clear();
  });
}

/* orphaned */
function _removeSelectedFromPlayerHand(playerId, cards) {
  cards.forEach(card => {
    const index = playerHands.indexOf(playerHands.find(player => player.id === playerId));

    playerHands[index].findIndex(element => {
      return element.suit === card.suit && element.sort === card.sort;
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

function _hit(id) {
  const index = playerHands.findIndex(hand => hand.id === id);
  const ret = _draw(1);
  playerHands[index].hand.push(ret);
  return ret;
}

export default DeckStore;
