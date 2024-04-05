import { PlayingCard } from "../classes";
import { PlayingCardKey } from "../types";

export interface IPlayingCardDeck {
  cards: PlayingCard[];
  deal: (numberOfCards: number) => void;
  draw: (numberOfCards: number) => PlayingCard[] | undefined;
  drawFromBottomOfDeck: (numberOfCards: number) => PlayingCard[];
  drawn: PlayingCard[];
  drawRandom: (numberOfCards: number) => PlayingCard[];
  length: number;
  putOnBottomOfDeck: (cards: PlayingCard[]) => void;
  putOnTopOfDeck: (cards: PlayingCard[]) => void;
  reset: () => void;
  select: (key: PlayingCardKey) => void;
  selected: PlayingCard[];
  shuffle: () => void;
  unselect: (key: PlayingCardKey) => void;
}
