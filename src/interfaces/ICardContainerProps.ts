import { IPlayingCardSort, IPlayingCardSuit } from '../interfaces';
import { CardStyle, PlayingCardKey } from '../types';

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
  /** face layout; defaults to the card style setting */
  cardStyle?: CardStyle;
  select?: () => void;
  sort: IPlayingCardSort;
  suit: IPlayingCardSuit;
}
