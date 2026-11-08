import { PlayerStats, ProfileState } from "../types";

/**
 * Actions for the profile store
 */
export type IProfileAction =
  /** add a human profile named `name` and select it */
  | { type: 'create'; name: string }
  /** choose the human profile that plays the next game */
  | { type: 'select'; id: string }
  /** seat or unseat a computer character for the next game */
  | { type: 'toggleOpponent'; id: string }
  /** replace each profile's stats with the given values, keyed by profile id */
  | { type: 'syncStats'; stats: Record<string, PlayerStats> }
  /** replace the whole store with a copy from the server, repaired like a saved one */
  | { type: 'replace'; state: ProfileState }
  /** back to the default profiles */
  | { type: 'reset' };
