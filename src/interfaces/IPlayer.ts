import { PlayerAction, PlayerStatus } from '../enums';
import { PlayerStats } from '../types';

export interface IPlayer {
  bank: number;
  disabled?: boolean;
  id: number;
  isFinished?: boolean;
  isNPC: boolean;
  isSelected?: boolean;
  isStaying?: boolean;
  key: string;
  lastAction?: PlayerAction;
  lastAnte?: number;
  lastBet?: number;
  stats: PlayerStats;
  status?: PlayerStatus;
  title: string;
  totalBet?: number;
  turn?: boolean;
}
