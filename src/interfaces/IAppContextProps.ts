import { PlayerStore, } from '../classes';
import { ISettingStoreProps, IGameStoreProps, IDeckStoreProps } from '.';

export interface IAppContextProps {
  initializeStores: () => void;
  clearStores: () => void;
  playerStore: PlayerStore;
  settingStore: ISettingStoreProps;
  gameStore: IGameStoreProps;
  deckStore: IDeckStoreProps;
}
