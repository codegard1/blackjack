import { PlayerKey, PlayingCardKey, RoundResult } from '.';

/**
 * Cards belonging to a specific player
 */
export type PlayerHand = {
  cards: PlayingCardKey[];
  handValue: PlayerHandValue;
  splitHands?: PlayerHand[];
  stake?: number;
  result?: RoundResult;
  isBusted?: boolean;
  isStaying?: boolean;
  isBlackjack?: boolean;
  isSplit?: boolean;
  isSplitAces?: boolean;
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
