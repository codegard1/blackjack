import { IPlayer } from '../interfaces';
import { PlayingCardKey } from '../types';

export interface ICardStackProps {
  cards: PlayingCardKey[];
  hidden: boolean;
  isSelectable: boolean;
  player?: IPlayer;
  title: string;
  /** 'mini' is the compact hand shown on a collapsed seat; it has no hand value line */
  variant?: 'seat' | 'mini';
}
