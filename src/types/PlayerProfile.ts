import { PlayerStats } from "./PlayerStats";

/**
 * A named identity that can play as the human player. Lifetime stats accumulate across games.
 * The dealer is stored as a profile too, so its stats are kept in the same way.
 */
export type PlayerProfile = {
  id: string;
  name: string;
  createdAt: number;
  stats: PlayerStats;
};

/** All profiles and the human profile that plays the next game */
export type ProfileState = {
  profiles: PlayerProfile[];
  selectedId: string;
};
