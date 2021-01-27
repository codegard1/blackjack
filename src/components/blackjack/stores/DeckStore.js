import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import Shuffle from "./Shuffle";
import { PlayerHand } from "./PlayerHand";
import PlayingCard from "./PlayingCard";

/*========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "deck";
const DeckStore = Object.assign({}, EventEmitter.prototype, {

  // in-memory state
  state: {
    deck: [],
    drawn: [],
    playerHands: [],
    selected: [],
  },

  // return state toa  subscriber
  getState() { return this.state },

  // notify subscribers of a state change and save state to local storage
  emitChange() { this.emit(CHANGE_EVENT); },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  // check whether selected cards are in a player's hand
  getSelected(playerId) {
    if (this.state.selected.length > 0) {
      let foundMatch = false;
      let foundCards = [];
      let playerHand = this.getHand(playerId);

      /* check each card in selected to see if it's in the specified player's hand */
      this.state.selected.forEach(selectedCard => {
        playerHand.forEach(playerCard => {
          // console.log(`comparing ${selectedCard} to ${playerCard}`);
          if (
            playerCard.suit === selectedCard.suit &&
            playerCard.sort === selectedCard.sort
          ) {
            // console.log(`Found Match: ${selectedCard}`);
            foundMatch = true;
            foundCards.push(selectedCard);
          }
        });
      });

      if (foundMatch && foundCards.length > 0) {
        // console.log(`selected cards for id ${playerId}`, foundCards);
        return foundCards;
      } else {
        // console.log(`no cards are selected by player (${playerId}).`);
        return false;
      }
    } else {
      // console.log("no cards are selected.");
      return false;
    }
  },

  getDrawn(playerId) {
    return this.state.drawn.find(item => item.id === playerId);
  },

  getHand(playerId) {
    const ret = this.state.playerHands.find(item => item.id === playerId);
    if (ret) {
      return ret.hand;
    } else {
      return [];
    }
  },

  getHands() {
    return this.state.playerHands;
  },
  
  getHandValue(key) {
    if (this.state.playerHands.length > 0) {
      let index = this.state.playerHands.findIndex(player => player.key === key);
      // console.log(`getHandValue: playerHands[index]`);
      return this.state.playerHands[index].evaluate();
    } else {
      return { aceAsOne: 0, AceAsEvelen: 0 };
    }
  },

  newDeck() {
    /* returns a new Deck populated with PlayingCards */
    this.state.deck = new Shuffle();
    this.state.selected = [];
    this.state.drawn = [];
  },

  drawFromBottomOfDeck(num) {
    const ret = this.state.deck.drawFromBottomOfDeck(num);
    this.state.drawn.push(ret);
    // log(`drawFromBottomOfDeck: ${ret}`);
  },

  drawRandom(num) {
    const ret = this.state.deck.drawRandom(num);
    this.state.drawn.push(ret);
    // log(`drawRandom: ${ret}`);
    return ret;
  },

  putOnTopOfDeck(cards = this.state.selected) {
    this.state.deck.putOnTopOfDeck(cards);
    this.removeSelectedFromDrawn();
    this.clearSelected();
  },

  putOnBottomOfDeck(cards = this.state.selected) {
    this.state.deck.putOnBottomOfDeck(cards);
    this.removeSelectedFromDrawn();
    this.clearSelected();
  },

  /* sets the deck back to a full 52-card deck, unshuffled */
  reset() {
    this.state.deck.reset();
  },

  draw(num) {
    const ret = this.state.deck.draw(num);
    if (num > 1) {
      ret.forEach(item => this.state.drawn.push(item));
    } else {
      this.state.drawn.push(ret);
    }
    return ret;
  },

  shuffle() { this.state.deck.shuffle() },

  clearSelected() { this.state.selected = [] },

  removeSelectedFromDrawn() {
    this.state.selected.forEach(card => {
      const index = this.state.drawn.findIndex(element => {
        return element.suit === card.suit && element.sort === card.sort;
      });
      this.state.drawn.splice(index, 1);
    });
  },

  select(cardAttributes) {
    this.state.selected.push(
      new PlayingCard(
        cardAttributes.suit,
        cardAttributes.description,
        cardAttributes.sort
      )
    );
  },

  deselect(cardAttributes) {
    const toDeselect = this.state.selected.findIndex(
      card =>
        card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
    );
    this.state.selected.splice(toDeselect, 1);
  },

  newPlayerHand(playerId, playerKey) {
    this.state.playerHands.push(new PlayerHand(playerId, playerKey));
  },

  clearHands() {
    this.state.playerHands.forEach(hand => {
      hand.clear();
    });
  },

  removeSelectedFromPlayerHand(playerId, cards) {
    cards.forEach(card => {
      const index = this.state.playerHands.findIndex(player => player.id === playerId);

      this.state.playerHands[index].findIndex(element => {
        return element.suit === card.suit && element.sort === card.sort;
      });
      this.state.playerHands[index].splice(index, 1);
    });
  },

  deal() {
    this.state.playerHands.forEach(player => {
      player.hand = this.draw(2);
      player.evaluate();
      // console.log(`DeckStore::Deal  player ${player.id}'s hand: ${JSON.stringify(player.hand)}`);
    });
  },

  hit(id) {
    const index = this.state.playerHands.findIndex(hand => hand.id === id);
    const ret = this.draw(1);
    this.state.playerHands[index].hand.push(ret);
    return ret;
  },

});

/*  ========================================================  */
/* register methods */
AppDispatcher.register(action => {

  switch (action.actionType) {

    case AppConstants.DECK_NEWDECK:
      DeckStore.newDeck();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAW:
      DeckStore.draw(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAWRANDOM:
      DeckStore.drawRandom(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DRAWFROMBOTTOMOFDECK:
      DeckStore.drawFromBottomOfDeck(action.num);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_RESET:
      DeckStore.reset();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_SHUFFLE:
      DeckStore.shuffle();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_PUTONBOTTOMOFDECK:
      DeckStore.putOnBottomOfDeck(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_PUTONTOPOFDECK:
      DeckStore.putOnTopOfDeck(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_REMOVESELECTEDFROMDRAWN:
      DeckStore.removeSelectedFromDrawn(action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_SELECT:
      DeckStore.select(action.cardAttributes);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DESELECT:
      DeckStore.deselect(action.cardAttributes);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_NEWPLAYERHAND:
      DeckStore.newPlayerHand(action.id, action.key);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_CLEARHANDS:
      DeckStore.clearHands();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_REMOVESELECTEDFROMPLAYERHAND:
      DeckStore.removeSelectedFromPlayerHand(action.playerId, action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DEAL:
      DeckStore.deal();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_HIT:
      DeckStore.hit(action.playerId);
      DeckStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

export default DeckStore;
