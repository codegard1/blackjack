import { PlayerKey } from '.';
import { IPlayer } from '../interfaces';

export type PlayerCollection = {
  [index: PlayerKey]: IPlayer;
};

export type PlayerCollectionKey = PlayerCollection[PlayerKey];
