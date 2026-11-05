import { IPlayingCardSort, IPlayingCardSuit } from '../interfaces';
import { PlayingCardKey } from '../types';

export interface ICardContainerProps {
  description: string;
  key: string;
  id: PlayingCardKey;
  /** position in the hand; staggers the deal-in animation */
  index?: number;
  deselect?: () => void;
  isBackFacing?: boolean;
  isSelectable?: boolean;
  isDescVisible?: boolean;
  select?: () => void;
  sort: IPlayingCardSort;
  suit: IPlayingCardSuit;
}
