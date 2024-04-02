import { Player, PlayingCard } from "../classes";

export interface ICardStackProps {
  cards: PlayingCard[];
  hidden: boolean;
  isSelectable: boolean;
  player?: Player;
  title: string;
}
