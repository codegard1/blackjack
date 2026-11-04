import { PlayerKey } from '../types';

export interface ITableProps {
  /** players chosen on the splash screen; shown as chips before the game starts */
  pendingPlayerKeys: PlayerKey[];
}
