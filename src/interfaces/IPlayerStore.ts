import { IPlayer, IPlayerOptions } from '.';
import { PlayerKey, PlayerStats, } from '../types';
import { IPlayerStoreState } from './IPlayerStoreState';

/**
 * Class that tracks and manipulates Player objects
 */
export interface IPlayerStore {
  isCurrentPlayerNPC: null | boolean;
  all: IPlayer[];
  allPlayersAnte: (amount: number) => void;
  allPlayersFinish: () => void;
  ante: (key: PlayerKey, amount: number) => void;
  bet: (key: PlayerKey, amount: number) => void;
  bust: (key: PlayerKey) => void;
  clearStore: () => void;
  currentPlayer?: IPlayer;
  endTurn: (key: PlayerKey) => void;
  finish: (key: PlayerKey) => void;
  hit: (key: PlayerKey) => void;
  length: number;
  newPlayer: (options: IPlayerOptions) => void;
  newRound: () => void;
  nextPlayer: () => void;
  payout: (key: PlayerKey, amount: number) => void;
  player: (key: PlayerKey) => IPlayer;
  playerName: (key: PlayerKey) => string;
  reset: () => void;
  resetPlayer: (key: PlayerKey, omit: string) => void;
  saveAll: () => Promise<void>;
  startTurn: (key: PlayerKey) => void;
  state: IPlayerStoreState;
  stats: (key: PlayerKey) => PlayerStats;
  stay: (key: PlayerKey) => void;
}


