import { PlayerKey } from '.';
import { IPlayer } from './IPlayer';

export type PlayerCollection = {
  [index: PlayerKey]: IPlayer;
};

export type PlayerCollectionKey = PlayerCollection[PlayerKey];
