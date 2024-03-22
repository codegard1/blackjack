import { PlayerHand } from ".";

/**
 * Basic properties of a Player class
 */
export type BasePlayer = {
  bank: number;
  disabled: boolean;
  hand: PlayerHand;
  hasBlackjack: boolean;
  id: number;
  isBusted: boolean;
  isNPC: boolean;
  key: string;
  title: string;
}

export type PlayerKey = BasePlayer['key'];
