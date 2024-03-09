import { PlayingCard } from "../classes";

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
}
