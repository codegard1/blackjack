import { PlayerStore, PlayingCardDeck, } from '../classes';
import { ISettingStoreProps, IGameStoreProps } from '.';

export interface IAppContextProps {
  initializeStores: () => void;
  clearStores: () => void;
  settingStore: ISettingStoreProps;
  gameStore: IGameStoreProps;
}
