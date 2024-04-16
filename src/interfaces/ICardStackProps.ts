import { PlayingCard } from '../classes';
import { IPlayer } from '../interfaces'

export interface ICardStackProps {
  cards: PlayingCard[];
  hidden: boolean;
  isSelectable: boolean;
  player?: IPlayer;
  title: string;
}
