import { PlayerStats } from "../types";

/**
 * Actions for the profile store
 */
export type IProfileAction =
  /** add a human profile named `name` and select it */
  | { type: 'create'; name: string }
  /** choose the human profile that plays the next game */
  | { type: 'select'; id: string }
  /** replace each profile's stats with the given values, keyed by profile id */
  | { type: 'syncStats'; stats: Record<string, PlayerStats> }
  /** back to the default profiles */
  | { type: 'reset' };
