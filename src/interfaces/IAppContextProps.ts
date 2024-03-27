import { IGameStoreProps } from '.';
import { PlayerStore, PlayingCardDeck, } from '../classes';

export interface IAppContextProps {
  initializeStores: () => void;
  clearStores: () => void;
  playerStore: PlayerStore | null;
  gameStore: IGameStoreProps;
  deck: PlayingCardDeck | null;
}
