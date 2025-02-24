import { IPlayer, IPlayerOptions } from '.';
import { PlayerCollection, PlayerKey, PlayerStats, } from '../types';

export interface IPlayerStoreState {
  players: PlayerCollection;
  activePlayerKeys?: PlayerKey[];
  currentPlayerKey?: PlayerKey;
  lastWriteTime: string;
}

/**
 * Class that tracks and manipulates Player objects
 */
export interface IPlayerStore extends IPlayerStoreState {
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
  isCurrentPlayerNPC: null | boolean;
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


