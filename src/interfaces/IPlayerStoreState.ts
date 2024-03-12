import { PlayerKey } from '../types';
import { PlayerCollection } from '../types/PlayerCollection';


export interface IPlayerStoreState {
  players: PlayerCollection;
  activePlayerKeys: PlayerKey[];
  currentPlayerKey: null | PlayerKey;
  lastWriteTime: string;
}
