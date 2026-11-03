import { IPlayingCardSort, IPlayingCardSuit } from '../interfaces';
import { PlayingCardKey } from '../types';

export interface ICardContainerProps {
  description: string;
  key: string;
  id: PlayingCardKey;
  deselect?: () => void;
  isBackFacing?: boolean;
  isSelectable?: boolean;
  isDescVisible?: boolean;
  isTitleVisible?: boolean;
  select?: () => void;
  sort: IPlayingCardSort;
  suit: IPlayingCardSuit;
}
