import { Player } from '../classes/Player';
import { IPlayerStoreState } from '../stores/PlayerStore';
import { PlayerCollection, PlayerKey, } from '../types';

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
  playerName: string;
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
  _setStatus: (key: PlayerKey) => void;
  _getHigherHandValue: (key: PlayerKey) => void;
  _payout: (key: PlayerKey, amount: number) => void;
  _startTurn: (key: PlayerKey) => void;
  _stay: (key: PlayerKey) => void;
  currentPlayer: Player;
  _isCurrentPlayerNPC: boolean;
}


