import { PlayingCard } from '../classes';
import { PlayerHandValue } from './PlayerHandValue';

export type PlayerHand = {
  cards: PlayingCard[];
  handValue: PlayerHandValue
};
