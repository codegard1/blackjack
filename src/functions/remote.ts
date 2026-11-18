import { StoreName } from '../enums';

/** The kinds of state kept on the server, each in its own function and collection */
export type SyncKind = 'profiles' | 'game';

/** Where each kind's Netlify function is routed (see netlify/functions) */
export const SYNC_API: Record<SyncKind, string> = {
  profiles: '/api/profiles',
  game: '/api/game',
};

/** Where a browser asks for its owner id or exchanges a Google credential */
export const OWNER_API = '/api/owner';

/** What the server holds for one owner and kind */
export type RemoteState<T = unknown> = { data: T; updatedAt: number };

/** Display details for a signed-in Google account */
export type GoogleUser = {
  name: string;
  email?: string;
  picture?: string;
};

/**
 * This browser's sync bookkeeping. The owner id names this browser or signed-in
 * Google account to the server; it is issued and signed by the server, and absent
 * until that has happened. Each syncedAt is the server's updatedAt from the last
 * successful read or write of that kind, so a later remote write can be recognized
 * as newer than what this browser has seen.
 */
export type SyncState = {
  ownerId?: string;
  user?: GoogleUser;
  /** true right after signing in from an anonymous browser, until profiles reconcile */
  mergeAnonymous?: boolean;
  syncedAt: Record<SyncKind, number>;
};

const OWNER_KIND = 'browser';
const GOOGLE_KIND = 'google';

/** An id the server issued: kind, identifier, a dot and the signature */
const SIGNED_OWNER_ID = /^[a-z]{2,16}:[A-Za-z0-9._-]{8,128}\.[A-Za-z0-9_-]{20,128}$/;

const noSync = (): Record<SyncKind, number> => ({ profiles: 0, game: 0 });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const listeners = new Set<() => void>();

function notifySyncListeners(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to changes in the saved sync state (such as signing in or out) */
export function subscribeSyncState(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toGoogleUser(value: unknown): GoogleUser | undefined {
  if (!isObject(value) || typeof value.name !== 'string' || !value.name.trim()) return undefined;
  return {
    name: value.name.trim(),
    ...(typeof value.email === 'string' && value.email ? { email: value.email } : {}),
    ...(typeof value.picture === 'string' && value.picture ? { picture: value.picture } : {}),
  };
}

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
  const user = value.ownerId.startsWith(`${GOOGLE_KIND}:`) ? toGoogleUser(value.user) : undefined;
  return {
    ownerId: value.ownerId,
    ...(user ? { user } : {}),
    ...(value.mergeAnonymous === true ? { mergeAnonymous: true } : {}),
    syncedAt,
  };
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
        // If the user signed in with Google while the anonymous request was in flight, keep the Google id
        const latest = loadSyncState();
        if (latest.ownerId) return latest.ownerId;
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
  const { mergeAnonymous, ...rest } = state;
  saveSyncState({
    ...rest,
    ...(kind !== 'profiles' && mergeAnonymous ? { mergeAnonymous } : {}),
    syncedAt: { ...state.syncedAt, [kind]: updatedAt },
  });
}

/**
 * Exchange a Google ID token (`credential`) for a signed `google:<sub>` owner id
 * and store the signed-in account in sync state.
 */
export async function signInWithGoogle(
  credential: string,
): Promise<{ ownerId: string; user: GoogleUser } | { error: string }> {
  try {
    const response = await fetch(OWNER_API, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const message = isObject(body) && typeof body.error === 'string'
        ? body.error
        : 'Could not sign in with Google.';
      return { error: message };
    }
    const issued = isObject(body) ? body.ownerId : undefined;
    const user = isObject(body) ? toGoogleUser(body.user) : undefined;
    if (typeof issued !== 'string' || !SIGNED_OWNER_ID.test(issued) || !issued.startsWith(`${GOOGLE_KIND}:`) || !user) {
      return { error: 'Invalid response from authentication server.' };
    }
    const previous = loadSyncState();
    const wasAnonymous = !previous.ownerId || previous.ownerId.startsWith(`${OWNER_KIND}:`);
    saveSyncState({
      ownerId: issued,
      user,
      ...(wasAnonymous ? { mergeAnonymous: true } : {}),
      syncedAt: noSync(),
    });
    notifySyncListeners();
    return { ownerId: issued, user };
  } catch {
    return { error: 'Could not reach authentication server.' };
  }
}

/**
 * Sign out of the current Google account so this browser starts fresh under a new
 * anonymous browser owner id.
 */
export function signOutGoogle(): void {
  saveSyncState({ syncedAt: noSync() });
  notifySyncListeners();
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

/**
 * The owner id is this browser's credential for its data, so it is sent in the
 * Authorization header and not in the address, which servers and proxies log.
 */
const ownerHeaders = (ownerId: string): Record<string, string> => ({ Accept: 'application/json', Authorization: `Bearer ${ownerId}` });

/**
 * Fetch the owner's copy of one kind of state. Resolves to undefined when the server
 * has none, cannot be reached, or answers with anything unexpected.
 */
export async function fetchRemote(kind: SyncKind, ownerId: string): Promise<RemoteState | undefined> {
  try {
    const response = await fetch(SYNC_API[kind], { headers: ownerHeaders(ownerId), cache: 'no-store' });
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
    const response = await fetch(SYNC_API[kind], {
      method: 'PUT',
      headers: { ...ownerHeaders(ownerId), 'Content-Type': 'application/json' },
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
