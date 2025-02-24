import { PlayerKey } from "../types";

/**
 * Options for creating a new instance of Player
 */
export interface IPlayerOptions {
  key: PlayerKey;
  title: string;
  isNPC: boolean;
  id: number;
  bank: number;
  disabled?: boolean;
}
