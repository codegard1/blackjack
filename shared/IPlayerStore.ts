import { PlayerCollection, PlayerKey } from './';

export interface IPlayerStoreState {
  players: PlayerCollection;
  activePlayerKeys?: PlayerKey[];
  currentPlayerKey?: PlayerKey;
  lastWriteTime: string;
}
