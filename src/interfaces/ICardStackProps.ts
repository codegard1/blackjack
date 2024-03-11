import { Player, PlayingCard } from "../classes";

export interface ICardStackProps {
  // handValue: any; // DeckStore
  // isNPC: boolean; // props
  // isPlayerDeck: boolean;
  // turnCount: number; // GameStore
  // cards: PlayingCard[];
  hidden: boolean; // props
  isSelectable: boolean; // props
  player: Player; // GameStore
  title: string; // props
}
