import { IPlayingCardSort, IPlayingCardSuit } from '../interfaces';

export interface ICardContainerProps {
  description: string;
  key: string;
  deselect?: () => void;
  isBackFacing?: boolean;
  isSelectable?: boolean;
  isDescVisible?: boolean;
  select?: () => void;
  sort: IPlayingCardSort;
  suit: IPlayingCardSuit;
}
