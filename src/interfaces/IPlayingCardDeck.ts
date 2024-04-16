import { PlayingCard } from "../classes";
import { PlayingCardKey } from "../types";

export interface IPlayingCardDeck {
  cards: PlayingCard[];
  deal: (numberOfCards: number) => void;
  draw: (numberOfCards: number) => PlayingCardKey[] | undefined;
  drawFromBottomOfDeck: (numberOfCards: number) => PlayingCardKey[];
  drawn: PlayingCard[];
  drawRandom: (numberOfCards: number) => PlayingCardKey[];
  length: number;
  putOnBottomOfDeck: (cards: PlayingCard[]) => void;
  putOnTopOfDeck: (cards: PlayingCard[]) => void;
  reset: () => void;
  select: (key: PlayingCardKey) => void;
  selected: PlayingCard[];
  shuffle: () => void;
  unselect: (key: PlayingCardKey) => void;
}
