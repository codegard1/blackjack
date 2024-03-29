import { DeckAction } from "../enums";
import { PlayerKey, PlayingCardKey } from "../types";

/**
 * Dispatcher that changes state values
 */
export interface IDeckReducerAction {
  type: string | DeckAction;
  cardKey?: PlayingCardKey;
  playerKey?: PlayerKey;
  numberOfCards?: number;
  
}
