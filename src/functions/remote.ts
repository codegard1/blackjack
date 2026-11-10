import { StoreName } from '../enums';

/** The kinds of state kept on the server, each in its own function and collection */
export type SyncKind = 'profiles' | 'game';

/** Where each kind's Netlify function is routed (see netlify/functions) */
export const SYNC_API: Record<SyncKind, string> = {
  profiles: '/api/profiles',
  game: '/api/game',
};

/** Where a browser asks for its owner id */
export const OWNER_API = '/api/owner';

/** What the server holds for one owner and kind */
export type RemoteState<T = unknown> = { data: T; updatedAt: number };

/**
 * This browser's sync bookkeeping. The owner id names this browser to the server; it
 * is issued and signed by the server, and absent until that has happened. Each
 * syncedAt is the server's updatedAt from the last successful read or write of that
 * kind, so a later remote write can be recognized as newer than what this browser
 * has seen.
 */
export type SyncState = { ownerId?: string; syncedAt: Record<SyncKind, number> };

const OWNER_KIND = 'browser';

/** An id the server issued: kind, identifier, a dot and the signature */
const SIGNED_OWNER_ID = /^[a-z]{2,16}:[A-Za-z0-9-]{8,64}\.[A-Za-z0-9_-]{20,128}$/;

const noSync = (): Record<SyncKind, number> => ({ profiles: 0, game: 0 });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Read a saved sync state. An id from before ids were signed is dropped along with
 * its sync times: the server no longer serves it, so this browser starts over with
 * a new id and sends its local copy under that.
 */
function toSyncState(value: unknown): SyncState | undefined {
  if (!isObject(value)) return undefined;
  if (typeof value.ownerId !== 'string' || !SIGNED_OWNER_ID.test(value.ownerId)) return { syncedAt: noSync() };
  const syncedAt = noSync();
  if (isObject(value.syncedAt)) {
    for (const kind of Object.keys(syncedAt) as SyncKind[]) {
      const at = value.syncedAt[kind];
      if (typeof at === 'number') syncedAt[kind] = at;
    }
  }
  return { ownerId: value.ownerId, syncedAt };
}

/** The saved sync state; without an owner id until the server has issued one */
export function loadSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(StoreName.SYNCSTORE);
    const saved = toSyncState(raw === null ? undefined : JSON.parse(raw));
    if (saved) return saved;
  } catch {
    // unreadable or unavailable storage
  }
  return { syncedAt: noSync() };
}

let minting: Promise<string | undefined> | undefined;

/**
 * This browser's owner id, asking the server for one the first time. Concurrent
 * callers share the one request. Resolves to undefined when the server cannot be
 * reached; the next call asks again.
 */
export function ensureOwnerId(): Promise<string | undefined> {
  const { ownerId } = loadSyncState();
  if (ownerId) return Promise.resolve(ownerId);
  if (!minting) {
    minting = (async () => {
      try {
        const response = await fetch(OWNER_API, { method: 'POST', headers: { Accept: 'application/json' } });
        if (!response.ok) return undefined;
        const body: unknown = await response.json();
        const issued = isObject(body) ? body.ownerId : undefined;
        if (typeof issued !== 'string' || !SIGNED_OWNER_ID.test(issued) || !issued.startsWith(`${OWNER_KIND}:`)) return undefined;
        saveSyncState({ ownerId: issued, syncedAt: noSync() });
        return issued;
      } catch {
        return undefined;
      } finally {
        minting = undefined;
      }
    })();
  }
  return minting;
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

/**
 * Forget an owner id the server has refused, such as one signed before the signing
 * secret changed, so the next sync asks for a new one and sends the local copies
 * under it. Only that id is dropped: a concurrent caller may already hold a new one.
 */
export function forgetOwnerId(rejected: string): void {
  if (loadSyncState().ownerId === rejected) saveSyncState({ syncedAt: noSync() });
}

const REJECTED_OWNER = 403;

const endpoint = (kind: SyncKind, ownerId: string) => `${SYNC_API[kind]}/${encodeURIComponent(ownerId)}`;

/**
 * Fetch the owner's copy of one kind of state. Resolves to undefined when the server
 * has none, cannot be reached, or answers with anything unexpected.
 */
export async function fetchRemote(kind: SyncKind, ownerId: string): Promise<RemoteState | undefined> {
  try {
    const response = await fetch(endpoint(kind, ownerId), { headers: { Accept: 'application/json' } });
    if (response.status === REJECTED_OWNER) forgetOwnerId(ownerId);
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
    if (response.status === REJECTED_OWNER) forgetOwnerId(ownerId);
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    const updatedAt = isObject(body) ? body.updatedAt : undefined;
    return typeof updatedAt === 'number' ? updatedAt : undefined;
  } catch {
    return undefined;
  }
}
