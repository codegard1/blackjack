import { PlayingCardSort, PlayingCardSuit } from '../classes';

export interface IPlayingCard {
  suit: PlayingCardSuit;
  description: string;
  sort: PlayingCardSort;
  key: string;
  toString: () => string;
  toShortDisplayString: () => string;
}
