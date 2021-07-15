import { EventEmitter } from "events";
import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

import Shuffle from "./Shuffle";
import PlayingCard from "./PlayingCard";

/*========================================================  */

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "deck";
const DeckStore = Object.assign({}, EventEmitter.prototype, {

  // in-memory state
  state: {
    deck: [],
    drawn: [],
    playerHands: {},
    selected: [],
  },

  defaultPlayerHandState: {
    handValue: { aceAsOne: 0, aceAsEleven: 0 },
    hand: [],
  },

  // return state toa  subscriber
  getState() { return this.state },

  // notify subscribers of a state change and save state to local storage
  emitChange() { this.emit(CHANGE_EVENT); },

  // subscribe to this store 
  addChangeListener(callback) { this.on(CHANGE_EVENT, callback) },

  // unsubscribe from this store
  removeChangeListener(callback) { this.removeListener(CHANGE_EVENT, callback) },

  /**
   * Check whether selected cards are in a player's hand
   * @param {string} playerKey key of the player to look up 
   * @returns {boolean|array}
   */
  getSelected(playerKey) {
    const { selected } = this.state;

    if (selected.length > 0) {
      let foundMatch = false;
      let foundCards = [];
      const playerHand = this.getHand(playerKey);

      /* check each card in selected to see if it's in the specified player's hand */
      selected.forEach(selectedCard => {
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
        return foundCards;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  /**
   * ??? Possibly useless function
   * @param {string} playerKey
   */
  // getDrawn(playerKey) {
  //   return this.state.drawn.find(item => item.id === playerId);
  // },

  /**
   * Get the hand of a specific player
   * @param {string} key key of the player whose hand to get
   * @returns {array}
   */
  getHand(key) {
    return this.state.playerHands[key].hand;
  },

  /**
   * Get all player hands
   * @returns {object}
   */
  getHands() {
    return this.state.playerHands;
  },

  /**
   * Get the hand value of a given player's hand
   * @param {string} key 
   */
  getHandValue(key) {
    return (this.state.playerHands[key]) ?
      this.evaluateHand(key) :
      this.defaultPlayerHandState.getHandValue;
  },

  /**
   * returns a new Deck populated with PlayingCards
   * @returns {void}
   */
  newDeck() {
    this.state.deck = new Shuffle();
    this.state.selected = [];
    this.state.drawn = [];
  },

  /**
   * Draw cards from the bottom of the deck
   * @param {number} num number of cards to draw
   * @returns {void}
   */
  drawFromBottomOfDeck(num) {
    const cards = this.state.deck.drawFromBottomOfDeck(num);
    this.state.drawn.push(cards);
  },

  /**
   * Draw cards randomly from the deck
   * @param {*} num number of cards to draw
   */
  drawRandom(num) {
    const cards = this.state.deck.drawRandom(num);
    this.state.drawn.push(cards);
    // log(`drawRandom: ${ret}`);
    return cards;
  },

  /**
   * put selected cards on top of the deck
   * @param {*} cards cards to put on top of the deck
   */
  putOnTopOfDeck(cards = this.state.selected) {
    this.state.deck.putOnTopOfDeck(cards);
    this.removeSelectedFromDrawn();
    this.clearSelected();
  },

  /**
   * Put selected cards on bottom of the deck
   * @param {*} cards cards to put on the bottom of the deck
   */
  putOnBottomOfDeck(cards = this.state.selected) {
    this.state.deck.putOnBottomOfDeck(cards);
    this.removeSelectedFromDrawn();
    this.clearSelected();
  },

  /**
   * sets the deck back to a full 52-card deck, unshuffled
   * @returns {void}
   */
  reset() { this.state.deck.reset() },

  /**
   * Draw cards from the deck
   * @param {number} num number of cards to draw from the deck
   */
  draw(num) {
    const cards = this.state.deck.draw(num);
    if (num > 1) {
      cards.forEach(card => this.state.drawn.push(card));
    } else {
      this.state.drawn.push(cards);
    }
    return cards;
  },

  /**
   * Shuffle the deck
   */
  shuffle() { this.state.deck.shuffle() },

  /**
   * Clear the selected cards list
   */
  clearSelected() { this.state.selected = [] },

  /**
   * Remove cards in the selected list from the drawn list
   */
  removeSelectedFromDrawn() {
    this.state.selected.forEach(card => {
      const index = this.state.drawn.findIndex(element => {
        return element.suit === card.suit && element.sort === card.sort;
      });
      this.state.drawn.splice(index, 1);
    });
  },

  /**
   * Select a specific card
   * @param {object} cardAttributes suit, description, and sort of the card to select
   */
  select(cardAttributes) {
    this.state.selected.push(
      new PlayingCard(
        cardAttributes.suit,
        cardAttributes.description,
        cardAttributes.sort
      )
    );
  },

  /**
   * Deselect a specific card
   * @param {object} cardAttributes suit, description, and sort of the card to deselect
   */
  deselect(cardAttributes) {
    const toDeselect = this.state.selected.findIndex(
      card =>
        card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
    );
    this.state.selected.splice(toDeselect, 1);
  },

  /**
   * Create a new playerHand object in PlayerStore state
   * @param {string} playerKey 
   * @returns {void}
   */
  newPlayerHand(playerKey) {
    this.state.playerHands[playerKey] = Object.assign({}, this.defaultPlayerHandState);
  },

  /**
   * Reset all player hands to default state
   * @returns {void}
   */
  clearHands() {
    for (const key in this.state.playerHands) { this.newPlayerHand(key) }
  },

  /**
   * Remove selected cards from the given player's hand
   * @param {string} key key of the player to affect
   * @param {array} cards array of cards to remove
   */
  removeSelectedFromPlayerHand(key, cards) {
    const { hand } = this.state.playerHands[key].hand;
    cards.forEach(card => {
      let index = hand.findIndex(element => {
        return element.suit === card.suit && element.sort === card.sort;
      });
      hand.splice(index, 1);
      this.state.playerHands[key] = hand;
    });
  },

  /**
   * Deal two cards to each player's hand
   * @returns {void}
   */
  deal() {
    for (const key in this.state.playerHands) {
      this.state.playerHands[key].hand = this.draw(2);
      this.evaluateHand(key);
    }
  },

  /**
   * Deal one card to the given player's hand
   * @param {string} key key of the affected player
   * @returns {object}
   */
  hit(key) {
    const card = this.draw(1);
    this.state.playerHands[key].hand.push(card);
    return card;
  },

  /**
   * Evaluate the possible values of a given player's hand
   * @param {string} key key of the player to look up
   * @returns {object}
   */
  evaluateHand(key) {
    const { hand } = this.state.playerHands[key];
    let handValue = { aceAsOne: 0, aceAsEleven: 0 };

    if (hand.length > 0) {
      hand.forEach(card => {
        switch (card.sort) {
          case 14: /* Ace */
            handValue.aceAsOne += 1;
            handValue.aceAsEleven += 11;
            break;

          case 13: /* King */
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          case 12: /* Queen */
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          case 11: /* Jack */
            handValue.aceAsOne += 10;
            handValue.aceAsEleven += 10;
            break;

          default:
            handValue.aceAsOne += card.sort;
            handValue.aceAsEleven += card.sort;
            break;
        }
      });
    }
    this.state.playerHands[key].handValue = handValue;
    return handValue;
  }

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
      DeckStore.newPlayerHand(action.key);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_CLEARHANDS:
      DeckStore.clearHands();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_REMOVESELECTEDFROMPLAYERHAND:
      DeckStore.removeSelectedFromPlayerHand(action.playerKey, action.cards);
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_DEAL:
      DeckStore.deal();
      DeckStore.emitChange();
      break;

    case AppConstants.DECK_HIT:
      DeckStore.hit(action.playerKey);
      DeckStore.emitChange();
      break;

    default:
      /* do nothing */
      break;
  }
});

export default DeckStore;
