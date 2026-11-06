import { PlayerAction, PlayerStatus } from '../enums';
import { PlayerStats, RoundResult } from '../types';
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
  /** could not cover the ante, so has no hand this round */
  isSittingOut?: boolean;
  key: string;
  lastAction?: PlayerAction;
  lastAnte?: number;
  lastBet?: number;
  /** rounds lost in a row; carries across rounds, reset by a win */
  lossStreak?: number;
  /** change to the bank from this round once it is settled, stake included */
  net?: number;
  /** how this round's hand ended against the dealer */
  result?: RoundResult;
  stats: PlayerStats;
  status?: PlayerStatus;
  title: string;
  totalBet?: number;
  turn?: boolean;
}
