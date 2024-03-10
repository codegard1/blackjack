import { BasePlayer } from '../types';
import { PlayerAction } from '../types/PlayerAction';

export interface IPlayer extends BasePlayer {
  bet: number;
  isFinished: boolean;
  isSelected: boolean;
  isStaying: boolean;
  lastAction: PlayerAction;
  status: string;
  turn: boolean;
}
