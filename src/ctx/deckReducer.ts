import { DeckAction } from "../enums";
import { _cardKeys, fisherYates, getRandomIndex } from "../functions";
import { IDeckReducerAction } from "../interfaces";
import { DeckState } from "../types";

/**
 * Reducer function for deck state
 * @param deck deck state object
 * @param action action containing the setting name and new value (optional)
 * @returns modified deck state
 */
export function deckReducer(deck: DeckState, action: IDeckReducerAction) {

  // Reducer action props. Only type is required
  const { type, cardKey, playerKey, numberOfCards, deckSide } = action;

  switch (type) {

    // Clear the list of selected cards
    case DeckAction.ClearSelected: {
      deck.selectedKeys = [];
      return deck;
    }

    // Create an entry in the playerHands list for the given Player
    case DeckAction.NewPlayerHand: {
      console.log('DeckAction.NewPlayerHand', playerKey, JSON.stringify(deck.playerHands));
      if ((undefined !== playerKey) && !(playerKey in deck.playerHands))
        deck.playerHands[playerKey] = [];
      return deck;
    }

    // Select a card
    case DeckAction.Select: {

      // If no cardKey was passed then do nothing 
      if (undefined === cardKey) return deck;

      if (!(cardKey in deck.selectedKeys))
        deck.selectedKeys.push(cardKey);

      return deck;
    }

    // Unselect a card
    case DeckAction.Unselect: {
      if (undefined === cardKey) return deck;

      if (cardKey in deck.selectedKeys)
        deck.selectedKeys.splice(deck.selectedKeys.indexOf(cardKey), 1);

      return deck;
    }

    // Draw card(s) from the deck
    case DeckAction.Draw: {
      const _num = (undefined === numberOfCards) ? 0 : numberOfCards;
      if (deck.cardKeys.length > _num) {

        switch (deckSide) {
          case 'top': {
            const _drawn = deck.cardKeys.splice(0, _num);
            deck.drawnKeys.push(..._drawn);
            if (undefined !== playerKey) deck.playerHands[playerKey].push(..._drawn);
            break;
          }
          case 'random': {
            for (let index = 0; index < _num; index++) {
              const _ix = getRandomIndex(deck.cardKeys);
              const _drawn = deck.cardKeys.splice(_ix, 1);
              deck.drawnKeys.push(..._drawn);
              if (undefined !== playerKey) deck.playerHands[playerKey].push(..._drawn);
            }
            break;
          }
          default: {

            const _drawn = deck.cardKeys.splice(deck.cardKeys.length - _num - 1);
            deck.drawnKeys.push(..._drawn);
            if (undefined !== playerKey) deck.playerHands[playerKey].push(..._drawn);
            break;
          }
        }
      }

      return deck;
    }

    // Put one card into the deck
    case DeckAction.Put: {

      // If no cardKey was passed then do nothing
      if (undefined === cardKey) return deck;

      // If cardKey is not in the deck already then put it
      if (!(cardKey in deck.cardKeys)) {

        // deckSide determines where in the cardKeys array the cardKey goes
        if (undefined !== deckSide) {
          switch (deckSide) {
            case 'top':
              deck.cardKeys.unshift(cardKey);
              break;
            case 'random':
              const _ix = getRandomIndex(deck.cardKeys);
              deck.cardKeys = [...deck.cardKeys.slice(0, _ix - 1), cardKey, ...deck.cardKeys.slice(_ix)];
              break;
            default:
              deck.cardKeys.push(cardKey);
              break;
          }
        }
      }

      // If the cardKey is in the list of drawn cards
      if (cardKey in deck.drawnKeys) {
        const ix = deck.drawnKeys.indexOf(cardKey);
        deck.drawnKeys.splice(ix, 1);
      }

      return deck;
    }

    // Shuffle the remaining card in the deck
    case DeckAction.Shuffle: {
      deck.cardKeys = fisherYates(deck.cardKeys);
      return deck;
    }

    // Populate and shuffle the deck
    case DeckAction.Reset: {
      deck.drawnKeys = [];
      deck.selectedKeys = [];
      deck.cardKeys = fisherYates(_cardKeys());
      deck.playerHands = {};
      return deck;
    }

    default: {
      return deck;
    }
  }
}
