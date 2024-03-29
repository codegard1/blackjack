import { DeckAction } from "../enums";
import { PlayerKey, PlayingCardKey } from "../types";

/**
 * Dispatcher that changes state values
 */
export interface IDeckReducerAction {
  type: DeckAction;
  cardKey?: PlayingCardKey;
  playerKey?: PlayerKey;
  numberOfCards?: number;
  deckSide?: 'top' | 'bottom' | 'random';
}
