import { PlayerHand } from ".";

export type BasePlayer = {
  bank: number;
  id: number;
  disabled?: boolean;
  hand: PlayerHand;
  isNPC: boolean;
  key: string;
  title: string;
}

export type PlayerKey = BasePlayer['key'];
