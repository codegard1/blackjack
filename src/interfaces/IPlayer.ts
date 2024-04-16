import { PlayerAction, PlayerStatus } from '../enums';
import { PlayerStats } from '../types';
import { IPlayerOptions } from './IPlayerOpts';

export interface IPlayer extends IPlayerOptions {
  bank: number;
  disabled?: boolean;
  id: number;
  isFinished?: boolean;
  isNPC: boolean;
  isSelected?: boolean;
  isBusted?: boolean;
  isBlackjack?: boolean;
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
