import { IPlayingCardSort, IPlayingCardSuit } from '.';

/**
 * Interface describing the class PlayingCard,
 * which inherits from the type PlayingCard
 */
export interface IPlayingCard {
  suit: IPlayingCardSuit;
  description: string;
  sort: IPlayingCardSort;
  key: string;
  toString: () => string;
  toShortDisplayString: () => string;
}
