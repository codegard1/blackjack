import { PlayerKey, PlayingCardKey } from '.';

/**
 * Cards belonging to a specific player
 */
export type PlayerHand = {
  cards: PlayingCardKey[];
  handValue: PlayerHandValue;
};

/**
 * Object specifying possible values for the given hand
 */
export type PlayerHandValue = {
  aceAsEleven: number;
  aceAsOne: number;
  highest: number;
};

/**
 * Object that indexes player hands by PlayerKey
 */
export type PlayerHandList = {
  [index: PlayerKey]: PlayerHand;
}
