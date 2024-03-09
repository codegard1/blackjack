import { PlayingCardSort, PlayingCardSuit } from '../classes';

export interface IPlayingCard {
  suit: PlayingCardSuit;
  description: string;
  sort: PlayingCardSort;
  toString: () => string;
  toShortDisplayString: () => string;
}
