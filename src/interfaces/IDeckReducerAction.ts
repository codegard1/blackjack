import { DeckAction } from "../enums";
import { PlayingCardKey } from "../types";

/**
 * Dispatcher that changes state values
 */
export interface IDeckReducerAction {
  type: string | DeckAction;
  cardKey: PlayingCardKey;

}
