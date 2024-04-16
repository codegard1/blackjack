import { PlayerKey, PlayingCardKey } from '.';

/**
 * 
 */
export type PlayerHand = {
  cards: PlayingCardKey;
  handValue: () => PlayerHandValue;
};

export type PlayerHandValue = {
  aceAsEleven: number;
  aceAsOne: number;
  highest: number;
};

export type PlayerHandList = {
  [index: PlayerKey]: PlayerHand;
}
