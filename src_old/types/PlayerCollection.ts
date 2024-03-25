import { PlayerKey } from '.';
import { Player } from '../classes';

export type PlayerCollection = {
  [index: PlayerKey]: Player;
};

export type PlayerCollectionKey = PlayerCollection[PlayerKey];
