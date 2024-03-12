import { PlayingCard } from "../classes";
import { PlayingCardKey } from "../types";

export interface IPlayingCardDeck {
  cards: PlayingCard[];
  deal: (numberOfCards: number, arrayOfHands: any[]) => PlayingCard[];
  draw: (numberOfCards: number) => PlayingCard[] | undefined;
  drawFromBottomOfDeck: (numberOfCards: number) => PlayingCard[];
  drawRandom: (numberOfCards: number) => PlayingCard[];
  length: number;
  putOnBottomOfDeck: (cards: PlayingCard[]) => void;
  putOnTopOfDeck: (cards: PlayingCard[]) => void;
  reset: () => void;
  shuffle: () => void;
  drawn: PlayingCard[];
  selected: PlayingCardKey[];
  select: (key: PlayingCardKey) => void;
  unselect: (key: PlayingCardKey) => void;
  drawnCardKeys: PlayingCardKey[];
  deckCardKeys: PlayingCardKey[];
}
