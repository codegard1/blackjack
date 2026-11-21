import { ActivityLogEntry, GameState } from "../types";

export type ActivityOptions = {
  /** change to the player's bank from this entry; negative when money is put in */
  amount?: number;
};

/**
 * Append an entry to the activity log, returning the updated game state.
 * Each entry is tagged with the current hand (round).
 */
export function recordActivity(
  state: GameState,
  name: string,
  description: string,
  event: ActivityLogEntry['event'],
  options: ActivityOptions = {},
): GameState {
  const lastEntry = state.activityLog[state.activityLog.length - 1];
  const entry: ActivityLogEntry = {
    id: (lastEntry?.id ?? 0) + 1,
    sessionId: event === 'game' ? (lastEntry ? (lastEntry.sessionId ?? 1) + 1 : 1) : (lastEntry?.sessionId ?? 1),
    round: state.round,
    event,
    // the time of the action being played, which the reducer has put on the state
    timestamp: Date.parse(state.lastWriteTime),
    name,
    description,
    ...(options.amount !== undefined ? { amount: options.amount } : {}),
  };
  return {
    ...state,
    activityLog: [...state.activityLog, entry],
  };
}
