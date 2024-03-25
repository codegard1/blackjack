import { PlayerStore, PlayingCardDeck, } from '../classes';
import { ISettingStoreProps, IGameStoreProps } from '.';

export interface IAppContextProps {
  initializeStores: () => void;
  clearStores: () => void;
  playerStore: PlayerStore | null;
  settingStore: ISettingStoreProps;
  gameStore: IGameStoreProps;
  deck: PlayingCardDeck | null;
}
