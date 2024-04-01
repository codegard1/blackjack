import { PlayingCardSort, PlayingCardSuit } from "../classes";

export type PlayingCard = {
  suit: PlayingCardSuit;
  description: string;
  sort: PlayingCardSort;
  key: string;
}
