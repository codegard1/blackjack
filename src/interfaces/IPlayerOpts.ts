import { PlayerKey, PlayerRole, PlayerStats } from "../types";

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
  /** human, computer character or dealer; when absent, an NPC is the dealer */
  role?: PlayerRole;
  /** lifetime stats carried into the game; defaults to empty stats */
  stats?: PlayerStats;
}
