import { BasePlayer } from '../types';
import { PlayerAction } from '../enums/PlayerAction';
import { PlayerStatus } from '../enums/PlayerStatus';

export interface IPlayer extends BasePlayer {
  bet: number;
  isFinished: boolean;
  isSelected: boolean;
  isStaying: boolean;
  lastAction: PlayerAction;
  status: PlayerStatus;
  turn: boolean;
}
