import { StoreName } from '../enums';

/** The kinds of state kept on the server, each in its own function and collection */
export type SyncKind = 'profiles' | 'game';

/** Where each kind's Netlify function is routed (see netlify/functions) */
export const SYNC_API: Record<SyncKind, string> = {
  profiles: '/api/profiles',
  game: '/api/game',
};

/** What the server holds for one owner and kind */
export type RemoteState<T = unknown> = { data: T; updatedAt: number };

/**
 * This browser's sync bookkeeping. The owner id names this browser to the server;
 * each syncedAt is the server's updatedAt from the last successful read or write of
 * that kind, so a later remote write can be recognized as newer than what this
 * browser has seen.
 */
export type SyncState = { ownerId: string; syncedAt: Record<SyncKind, number> };

const OWNER_KIND = 'browser';

const noSync = (): Record<SyncKind, number> => ({ profiles: 0, game: 0 });

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Read a saved sync state, accepting the first release's single profiles timestamp */
function toSyncState(value: unknown): SyncState | undefined {
  if (!isObject(value) || typeof value.ownerId !== 'string' || !value.ownerId.startsWith(`${OWNER_KIND}:`)) return undefined;
  if (typeof value.syncedAt === 'number') return { ownerId: value.ownerId, syncedAt: { ...noSync(), profiles: value.syncedAt } };
  if (!isObject(value.syncedAt)) return undefined;
  const syncedAt = noSync();
  for (const kind of Object.keys(syncedAt) as SyncKind[]) {
    const at = value.syncedAt[kind];
    if (typeof at === 'number') syncedAt[kind] = at;
  }
  return { ownerId: value.ownerId, syncedAt };
}

/**
 * The saved sync state, creating and saving a fresh owner id when there is none.
 * The id is random and lives only in this browser; it is the key the server stores
 * this browser's state under until a signed-in identity replaces it.
 */
export function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(StoreName.SYNCSTORE);
    const saved = toSyncState(raw === null ? undefined : JSON.parse(raw));
    if (saved) return saved;
  } catch {
    // unreadable or unavailable storage: start over below
  }
  const fresh = { ownerId: `${OWNER_KIND}:${randomId()}`, syncedAt: noSync() };
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

/** Record the server's timestamp for a kind that is now in step with it */
export function markSynced(kind: SyncKind, updatedAt: number): void {
  const state = loadSyncState();
  saveSyncState({ ...state, syncedAt: { ...state.syncedAt, [kind]: updatedAt } });
}

const endpoint = (kind: SyncKind, ownerId: string) => `${SYNC_API[kind]}/${encodeURIComponent(ownerId)}`;

/**
 * Fetch the owner's copy of one kind of state. Resolves to undefined when the server
 * has none, cannot be reached, or answers with anything unexpected.
 */
export async function fetchRemote(kind: SyncKind, ownerId: string): Promise<RemoteState | undefined> {
  try {
    const response = await fetch(endpoint(kind, ownerId), { headers: { Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    if (!isObject(body)) return undefined;
    const data = body[kind];
    const updatedAt = body.updatedAt;
    if (!isObject(data) || typeof updatedAt !== 'number') return undefined;
    return { data, updatedAt };
  } catch {
    return undefined;
  }
}

/**
 * Send the owner's copy of one kind of state. Resolves to the server's updatedAt, or
 * undefined when the write did not happen. With `keepalive` the request outlives the
 * page, for a final push when it is being closed; browsers cap such requests at
 * 64 KB, so a large game may not make it and is sent on the next visit instead.
 */
export async function pushRemote(kind: SyncKind, ownerId: string, data: unknown, keepalive = false): Promise<number | undefined> {
  try {
    const response = await fetch(endpoint(kind, ownerId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ [kind]: data }),
      keepalive,
    });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    const updatedAt = isObject(body) ? body.updatedAt : undefined;
    return typeof updatedAt === 'number' ? updatedAt : undefined;
  } catch {
    return undefined;
  }
}
