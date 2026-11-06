import historyFile from "../data/characterHistory.json";
import { PlayerStats } from "../types";

export type CharacterHistory = {
  seed: number;
  rounds: number;
  sessions: number;
  /** each character's stats from the simulated rounds, keyed by character id */
  stats: Record<string, PlayerStats>;
};

/**
 * The characters' simulated play history (see `npm run simulate-history`). It is kept
 * apart from the stats saved in the browser and added when a character's record is
 * shown, so regenerating it replaces the old history rather than adding to it.
 */
export const CHARACTER_HISTORY: CharacterHistory = historyFile;

/** Rounds a character played before joining this table, if any */
export function historyRounds(id: string): number {
  return CHARACTER_HISTORY.stats[id]?.numberOfGamesPlayed ?? 0;
}

/**
 * A character's record: their simulated history plus what they have played here.
 * Anyone without a history (a human player) gets their own stats back unchanged.
 */
export function withHistory(id: string, stats: PlayerStats): PlayerStats {
  const history = CHARACTER_HISTORY.stats[id];
  if (!history) return stats;
  const combined: PlayerStats = { ...stats };
  for (const key of Object.keys(history)) {
    if (key === 'winLossRatio') continue;
    combined[key] = (stats[key] ?? 0) + history[key];
  }
  const won = combined.numberOfGamesWon;
  const lost = combined.numberOfGamesLost;
  combined.winLossRatio = (won > 0 ? won : 1) / (lost > 0 ? lost : 1);
  return combined;
}
