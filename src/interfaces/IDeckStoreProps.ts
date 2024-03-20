import { PlayingCard, PlayingCardDeck } from '../classes';


export interface IDeckStoreProps {
  deck: PlayingCardDeck;
  newDeck: () => PlayingCardDeck;
  draw: (num: number) => void;
  drawRandom: (num: number) => void;
  drawFromBottomOfDeck: (num: number) => void;
  shuffle: () => void;
  putOnTopOfDeck: (cards: PlayingCard[]) => void;
  putOnBottomOfDeck: (cards: PlayingCard[]) => void;
  removeSelectedFromPlayerHand: (playerKey: string, cards: PlayingCard[]) => void;
  removeSelectedFromDrawn: (cards: PlayingCard[]) => void;
  select: (cardAttributes: any) => void;
  deselect: (cardAttributes: any) => void;
}
