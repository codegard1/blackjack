import { IPlayingCardSort, IPlayingCardSuit } from '../interfaces';
import { CardBackColor, CardBackPattern, CardStyle, PlayingCardKey } from '../types';

export interface ICardContainerProps {
  description: string;
  key: string;
  id: PlayingCardKey;
  /** position in the hand; staggers the deal-in animation */
  index?: number;
  deselect?: () => void;
  isBackFacing?: boolean;
  /** keep both faces on the card, so it turns over when isBackFacing changes; the dealer's hole card */
  isFlippable?: boolean;
  isSelectable?: boolean;
  isDescVisible?: boolean;
  /** face layout; defaults to the card style setting */
  cardStyle?: CardStyle;
  /** back pattern; defaults to the card back pattern setting */
  cardBackPattern?: CardBackPattern;
  /** back color; defaults to the card back color setting */
  cardBackColor?: CardBackColor;
  select?: () => void;
  sort: IPlayingCardSort;
  suit: IPlayingCardSuit;
}
