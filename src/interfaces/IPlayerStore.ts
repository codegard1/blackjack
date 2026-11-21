import { PlayerCollection, PlayerKey } from '../types';

export interface IPlayerStoreState {
  players: PlayerCollection;
  activePlayerKeys?: PlayerKey[];
  currentPlayerKey?: PlayerKey;
  lastWriteTime: string;
}
