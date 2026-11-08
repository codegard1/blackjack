import { StoreName } from '../enums';
import { ProfileState } from '../types';

/** Where the Netlify function for profiles is routed (see netlify/functions/profiles.ts) */
export const PROFILES_API = '/api/profiles';

/** What the server holds for this owner */
export type RemoteProfiles = { profiles: ProfileState; updatedAt: number };

/**
 * This browser's sync bookkeeping. The owner id names this browser to the server;
 * syncedAt is the server's updatedAt from the last successful read or write, so a
 * later remote write can be recognized as newer than what this browser has seen.
 */
export type SyncState = { ownerId: string; syncedAt: number };

const OWNER_KIND = 'browser';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

const isSyncState = (value: unknown): value is SyncState =>
  typeof value === 'object' && value !== null
  && typeof (value as SyncState).ownerId === 'string' && (value as SyncState).ownerId.startsWith(`${OWNER_KIND}:`)
  && typeof (value as SyncState).syncedAt === 'number';

/**
 * The saved sync state, creating and saving a fresh owner id when there is none.
 * The id is random and lives only in this browser; it is the key the server stores
 * the profiles under until a signed-in identity replaces it.
 */
export function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(StoreName.SYNCSTORE);
    const saved: unknown = raw === null ? undefined : JSON.parse(raw);
    if (isSyncState(saved)) return saved;
  } catch {
    // unreadable or unavailable storage: start over below
  }
  const fresh = { ownerId: `${OWNER_KIND}:${randomId()}`, syncedAt: 0 };
  saveSyncState(fresh);
  return fresh;
}

export function saveSyncState(state: SyncState): void {
  try {
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; sync bookkeeping is best-effort.
  }
}

/**
 * Fetch the owner's profiles from the server. Resolves to undefined when the server
 * has none, cannot be reached, or answers with anything unexpected.
 */
export async function fetchRemoteProfiles(ownerId: string): Promise<RemoteProfiles | undefined> {
  try {
    const response = await fetch(`${PROFILES_API}/${encodeURIComponent(ownerId)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return undefined;
    const { profiles, updatedAt } = body as Partial<RemoteProfiles>;
    if (typeof profiles !== 'object' || profiles === null || typeof updatedAt !== 'number') return undefined;
    return { profiles, updatedAt };
  } catch {
    return undefined;
  }
}

/**
 * Send the owner's profiles to the server. Resolves to the server's updatedAt, or
 * undefined when the write did not happen. With `keepalive` the request outlives the
 * page, for a final push when it is being closed.
 */
export async function pushRemoteProfiles(ownerId: string, profiles: ProfileState, keepalive = false): Promise<number | undefined> {
  try {
    const response = await fetch(`${PROFILES_API}/${encodeURIComponent(ownerId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ profiles }),
      keepalive,
    });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    const updatedAt = (body as Partial<RemoteProfiles> | null)?.updatedAt;
    return typeof updatedAt === 'number' ? updatedAt : undefined;
  } catch {
    return undefined;
  }
}
