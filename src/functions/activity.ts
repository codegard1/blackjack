import { ActivityLogEntry, GameState } from "../types";

export type ActivityOptions = {
  /** change to the player's bank from this entry; negative when money is put in */
  amount?: number;
};

/**
 * Append an entry to the activity log. Each entry is tagged with the current hand (round).
 */
export function recordActivity(
  state: GameState,
  name: string,
  description: string,
  event: ActivityLogEntry['event'],
  options: ActivityOptions = {},
): void {
  const lastEntry = state.activityLog[state.activityLog.length - 1];
  state.activityLog = [...state.activityLog, {
    id: (lastEntry?.id ?? 0) + 1,
    sessionId: event === 'game' ? (lastEntry ? (lastEntry.sessionId ?? 1) + 1 : 1) : (lastEntry?.sessionId ?? 1),
    round: state.round,
    event,
    timestamp: Date.now(),
    name,
    description,
    ...(options.amount !== undefined ? { amount: options.amount } : {}),
  }];
}
