import { IGameStoreProps } from '.';
import { PlayerStore } from '../classes';

export interface IAppContextProps {
  initializeStores: () => void;
  clearStores: () => void;
  playerStore: PlayerStore | null;
  gameStore: IGameStoreProps;
}
