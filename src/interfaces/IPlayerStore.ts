import { Player } from '../classes/Player';
import { IPlayerStoreState } from './IPlayerStoreState';
import { PlayerKey, PlayerStats, } from '../types';

/**
 * Class that tracks and manipulates Player objects
 */
export interface IPlayerStore {
  state: IPlayerStoreState;
  newPlayer: (key: PlayerKey, title: string, isNPC: boolean, id?: number, bank?: number, bet?: number) => void;
  saveAll: () => Promise<void>;
  clearStore: () => void;
  player: (key: PlayerKey) => Player;
  all: Player[];
  playerName: (key: PlayerKey) => string;
  length: number;
  reset: () => void;
  newRound: () => void;
  _allPlayersAnte: (amount: number) => void;
  _allPlayersFinish: () => void;
  _ante: (key: PlayerKey, amount: number) => void;
  _bet: (key: PlayerKey, amount: number) => void;
  _blackjack: (key: PlayerKey) => boolean;
  _bust: (key: PlayerKey) => void;
  _endTurn: (key: PlayerKey) => void;
  _finish: (key: PlayerKey) => void;
  _hit: (key: PlayerKey) => void;
  _nextPlayer: () => void;
  _resetPlayer: (key: PlayerKey, omit: string) => void;
  _payout: (key: PlayerKey, amount: number) => void;
  _startTurn: (key: PlayerKey) => void;
  _stay: (key: PlayerKey) => void;
  _stats: (key: PlayerKey) => PlayerStats;
  currentPlayer: null | Player;
  _isCurrentPlayerNPC: null | boolean;
}


