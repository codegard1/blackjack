import { PlayingCardSuit, PlayingCardSort } from '../classes';

export interface ICardContainerProps {
  description: string;
  deselect?: () => void;
  isBackFacing?: boolean;
  isSelectable?: boolean;
  isDescVisible?: boolean;
  select?: () => void;
  sort: PlayingCardSort;
  suit: PlayingCardSuit;
}
