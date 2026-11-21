import { PlayerStats } from "./PlayerStats";
import { CharacterWorkState, WorkTaskId } from "./Work";

/**
 * A named identity at the table. Lifetime stats accumulate across games.
 * Human players create their own profiles; the dealer and the computer
 * characters have fixed profiles, so their stats are kept in the same way.
 */
export type PlayerProfile = {
  id: string;
  name: string;
  createdAt: number;
  stats: PlayerStats;
  /** computer characters keep their bank, balance history and away-working state across games */
  bank?: number;
  balanceHistory?: number[];
  work?: CharacterWorkState;
  taskOverride?: WorkTaskId;
  allowReturn?: boolean;
};

/** All profiles, the human profile that plays the next game, and the computer players who join it */
export type ProfileState = {
  profiles: PlayerProfile[];
  selectedId: string;
  /** computer characters seated in the next game, at most MAX_OPPONENTS */
  opponentIds: string[];
};
