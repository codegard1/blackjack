import { IDeckReducerAction } from "../interfaces";
import { DeckState, } from "../types";
import { DeckAction } from "../enums";

/**
 * Reducer function for deck state
 * @param deck deck state object
 * @param action action containing the setting name and new value (optional)
 * @returns modified deck state
 */
export function deckReducer(deck: DeckState, action: IDeckReducerAction) {

  const { type, cardKey, playerKey } = action;

  switch (type) {
    // TODO
    case DeckAction.DRAW: {
      return deck;
    }

    case DeckAction.SELECT: {
      if (!(cardKey in deck.selectedKeys)) {
        deck.selectedKeys.push(cardKey);
      } else {
        const ix = deck.selectedKeys.indexOf(cardKey);
        deck.selectedKeys.splice(ix, 1);
      }
      return deck;
    }

    // TODO
    case DeckAction.PUT: {
      return deck;
    }

    default: {
      return deck;
    }
  }
}
