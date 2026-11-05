import { IPlayer } from './IPlayer';
import { PlayingCardKey, SeatStatus } from '../types';

export interface ISeatChipProps {
  player: IPlayer;
  /** status label, if any */
  status?: SeatStatus;
  /** hand total to show; omit to hide it */
  total?: number;
  /** gently bob the chip, used before the game starts */
  floating?: boolean;
  /** the seat's cards, shown face up or as a back as the table settings require */
  cards?: PlayingCardKey[];
  /** position in a group; staggers the floating animation */
  index?: number;
  /** when given, the chip is a button that brings this seat into focus */
  onSelect?: () => void;
}
