import { BasePlayer } from '../types';
import { PlayerAction } from '../enums/PlayerAction';
import { PlayerStatus } from '../enums/PlayerStatus';

export interface IPlayer extends BasePlayer {
  lastAction: PlayerAction;
  lastAnte: number;
  lastBet: number;
  status: PlayerStatus;
  turn: boolean;
}
