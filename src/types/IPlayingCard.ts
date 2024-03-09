import { PlayingCardSort } from "../classes/PlayingCardSort";
import { Suit } from "../classes/Suit";

export interface IPlayingCard {
  suit: Suit;
  description: string;
  sort: PlayingCardSort;
  toString: () => string;
  toShortDisplayString: () => string;
}
