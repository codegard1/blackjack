import { IPlayer } from '../interfaces';
import { PlayingCardKey } from '../types';

export interface ICardStackProps {
  cards: PlayingCardKey[];
  hidden: boolean;
  isSelectable: boolean;
  player?: IPlayer;
  title: string;
}
