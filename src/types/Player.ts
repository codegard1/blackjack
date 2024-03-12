import { PlayerHand } from ".";

export type BasePlayer = {
  bank: number;
  id: number;
  disabled?: boolean;
  hand: PlayerHand;
  isNPC: boolean;
  key: string;
  title: string;
  hasBlackjack: boolean;
  isBusted: boolean;
}

export type PlayerKey = BasePlayer['key'];
