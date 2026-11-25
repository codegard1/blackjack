import { BotAccountState, PlayerStats, ProfileState, WorkTaskId } from "./";

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
  /** replace each profile's stats (and optional character accounts) with the given values */
  | { type: 'syncStats'; stats: Record<string, PlayerStats>; botAccounts?: Record<string, BotAccountState> }
  /** override or clear a computer character's work task, or toggle whether they return when ready */
  | { type: 'configureWork'; id: string; taskOverride?: WorkTaskId | null; allowReturn?: boolean }
  /** replace the whole store with a copy from the server, repaired like a saved one */
  | { type: 'replace'; state: ProfileState }
  /** back to the default profiles */
  | { type: 'reset' };
