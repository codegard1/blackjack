import { PlayingCardSort } from "../classes/PlayingCardSort";
import { PlayingCardSuit } from "../classes/PlayingCardSuit";
import { Suit } from "../types";

export interface IPlayingCard {
  suit: PlayingCardSuit;
  description: string;
  sort: PlayingCardSort;
  toString: () => string;
  toShortDisplayString: () => string;
}
