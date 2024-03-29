import { IDeckReducerAction } from "../interfaces";
import { DeckState, PlayingCardKey, } from "../types";
import { DeckAction } from "../enums";
import { _cardKeys } from "../classes";
import { fisherYates } from "../functions";

/**
 * Reducer function for deck state
 * @param deck deck state object
 * @param action action containing the setting name and new value (optional)
 * @returns modified deck state
 */
export function deckReducer(deck: DeckState, action: IDeckReducerAction) {

  const { type, cardKey, playerKey } = action;

  switch (type) {

    // Draw a single card from the top of the deck
    case DeckAction.DrawOne: {
      if (deck.cardKeys.length > 0) {
        const _shifted = deck.cardKeys.shift();
        deck.drawnKeys.push(_shifted as PlayingCardKey);

        if (undefined !== playerKey)
          deck.playerHands[playerKey].push(_shifted as PlayingCardKey);
      }
      return deck;
    }

    // Select a card
    case DeckAction.Select: {
      if (undefined === cardKey) return deck;

      if (!(cardKey in deck.selectedKeys)) {
        deck.selectedKeys.push(cardKey);
      } else {
        const ix = deck.selectedKeys.indexOf(cardKey);
        deck.selectedKeys.splice(ix, 1);
      }
      return deck;
    }

    // Put one card on top of the deck
    case DeckAction.PutOne: {
      if (undefined === cardKey) return deck;

      if (!(cardKey in deck.cardKeys)) {
        deck.cardKeys.push(cardKey);
      }

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
      return deck;
    }

    default: {
      return deck;
    }
  }
}
