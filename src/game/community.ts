import React from 'react';
import { StoreName } from '../../shared';
import { CommunityStats, emptyTally, PlayerStats, Tally, TALLY_KEYS } from '../../shared';
import { historyRounds, withHistory } from './history';
import { ensureOwnerId, forgetOwnerId, ownerHeaders } from '../sync/remote';

/** Where the summed character stats are read (see netlify/functions/npc-stats.ts) */
export const COMMUNITY_API = '/api/npc-stats';

const REJECTED_OWNER = 403;

/** What a browser has before the server has told it anything: no play elsewhere */
export function emptyCommunity(): CommunityStats {
  return { generatedAt: 0, stats: {}, counted: {} };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Read tallies keyed by character id, keeping only whole-number tallies */
function toTallies(value: unknown): Record<string, Tally> | undefined {
  if (!isObject(value)) return undefined;
  const tallies: Record<string, Tally> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!isObject(raw)) return undefined;
    const tally = emptyTally();
    for (const key of TALLY_KEYS) {
      const stat = raw[key] ?? 0;
      if (typeof stat !== 'number' || !Number.isSafeInteger(stat)) return undefined;
      tally[key] = stat;
    }
    tallies[id] = tally;
  }
  return tallies;
}

/** Read summed stats from the server or from storage, or undefined when they are not that */
export function toCommunity(value: unknown): CommunityStats | undefined {
  if (!isObject(value) || typeof value.generatedAt !== 'number') return undefined;
  const stats = toTallies(value.stats);
  const counted = toTallies(value.counted);
  return stats && counted ? { generatedAt: value.generatedAt, stats, counted } : undefined;
}

function loadCommunity(): CommunityStats {
  try {
    const raw = localStorage.getItem(StoreName.COMMUNITYSTORE);
    return toCommunity(raw === null ? undefined : JSON.parse(raw)) ?? emptyCommunity();
  } catch {
    return emptyCommunity();
  }
}

let current: CommunityStats | undefined;
const listeners = new Set<() => void>();

/** The summed stats this browser last received; the saved copy until the server answers */
export function getCommunity(): CommunityStats {
  current ??= loadCommunity();
  return current;
}

/** Adopt summed stats from the server and keep them for the next visit, online or not */
export function setCommunity(next: CommunityStats): void {
  current = next;
  try {
    localStorage.setItem(StoreName.COMMUNITYSTORE, JSON.stringify(next));
  } catch {
    // Storage full or unavailable; the stats are fetched again on the next visit.
  }
  listeners.forEach((listener) => listener());
}

/** Forget the summed stats held in memory, so they are read from storage again; for tests */
export function resetCommunity(): void {
  current = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The summed stats, re-rendering when the server sends newer ones */
export function useCommunityStats(): CommunityStats {
  return React.useSyncExternalStore(subscribe, getCommunity, getCommunity);
}

/**
 * Ask the server for the summed stats and adopt them. Failures are silent: the saved
 * copy stays, and without one the characters show their simulated history and this
 * table's play alone.
 */
export async function refreshCommunity(): Promise<void> {
  const ownerId = await ensureOwnerId();
  if (ownerId === undefined) return;
  try {
    const response = await fetch(COMMUNITY_API, { headers: ownerHeaders(ownerId), cache: 'no-store' });
    if (response.status === REJECTED_OWNER) forgetOwnerId(ownerId);
    if (!response.ok) return;
    const next = toCommunity(await response.json());
    if (next && next.generatedAt !== getCommunity().generatedAt) setCommunity(next);
  } catch {
    // offline or unreachable
  }
}

/** Fetch the summed stats once when the app loads; off during tests, where there is no server */
export function useCommunitySync(options: { enabled?: boolean } = {}): void {
  const { enabled = import.meta.env.MODE !== 'test' } = options;
  React.useEffect(() => {
    if (enabled) void refreshCommunity();
  }, [enabled]);
}

/**
 * A character's stats across every table: the summed stats plus the hands played
 * here since this table was last added in. The hands already added in are taken out
 * so they are not counted twice. Fewer hands here than were added in means this
 * table's stats were cleared, so everything here is new, as the server will see it.
 * Anyone the server holds no sum for (a human player) gets their stats back unchanged.
 */
export function withCommunity(id: string, stats: PlayerStats, community: CommunityStats): PlayerStats {
  const shared = community.stats[id];
  if (!shared) return stats;
  const counted = community.counted[id] ?? emptyTally();
  const startedOver = (stats.numberOfGamesPlayed ?? 0) < counted.numberOfGamesPlayed;
  const combined: PlayerStats = { ...stats };
  for (const key of TALLY_KEYS) {
    const here = stats[key] ?? 0;
    const uncounted = startedOver ? here : here - counted[key];
    combined[key] = shared[key] + (key === 'netResult' ? uncounted : Math.max(0, uncounted));
  }
  const won = combined.numberOfGamesWon;
  const lost = combined.numberOfGamesLost;
  combined.winLossRatio = (won > 0 ? won : 1) / (lost > 0 ? lost : 1);
  return combined;
}

/** A character's full record: simulated history, every table's play, and this table's newest hands */
export function characterRecord(id: string, stats: PlayerStats, community: CommunityStats): PlayerStats {
  return withHistory(id, withCommunity(id, stats, community));
}

/** Hands in a character's record that were not played at this table */
export function roundsElsewhere(id: string, stats: PlayerStats, community: CommunityStats): number {
  const total = withCommunity(id, stats, community).numberOfGamesPlayed + historyRounds(id);
  return Math.max(0, total - (stats.numberOfGamesPlayed ?? 0));
}
