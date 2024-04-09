import { PlayerAction, PlayerStatus } from '../enums';
import { PlayerHandValue, PlayingCardKey } from '../types';

export interface IPlayer {
  lastAction: PlayerAction;
  lastAnte: number;
  lastBet: number;
  status: PlayerStatus;
  turn: boolean;
  bank: number;
  disabled: boolean;
  hand: PlayingCardKey[];
  handValue: PlayerHandValue;
  hasBlackjack: boolean;
  id: number;
  isBusted: boolean;
  isNPC: boolean;
  key: string;
  title: string;
}
