import { GameState, PotShare } from "../types";

/** True for the log entries where money went into the pot */
const isPotEvent = (event: string | undefined): boolean => event === 'ante' || event === 'bet' || event === 'double' || event === 'split';

/**
 * What each player has put into the pot in the current hand: the ante and every wager,
 * double down and split, added up per player in the order they first put money in.
 * Taken from the activity log, so a cleared log has nothing to show.
 * @param state current game state
 */
export function potBreakdown(state: GameState): PotShare[] {
  const sessionId = state.activityLog.at(-1)?.sessionId;
  const shares = new Map<string, PotShare>();
  for (const entry of state.activityLog) {
    const amount = -(entry.amount ?? 0);
    if (entry.round !== state.round || entry.sessionId !== sessionId || !isPotEvent(entry.event) || amount <= 0) continue;
    const share = shares.get(entry.name);
    if (share) {
      share.amount += amount;
    } else {
      shares.set(entry.name, {
        name: entry.name,
        amount,
        playerKey: state.playerStore.all.find((player) => player.title === entry.name)?.key,
      });
    }
  }
  return [...shares.values()];
}
