import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../enums';
import { defaultProfileState } from './profiles';
import { ensureOwnerId, fetchRemote, loadSyncState, markSynced, OWNER_API, pushRemote, saveSyncState, SYNC_API } from './remote';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c.c2lnbmVkLWJ5LXRoZS1zZXJ2ZXItZm9yLXRlc3RzLTAx';
const UNSIGNED = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('loadSyncState', () => {
  it('has no owner id until the server has issued one', () => {
    expect(loadSyncState()).toEqual({ syncedAt: { profiles: 0, game: 0 } });
    localStorage.setItem(StoreName.SYNCSTORE, '{not json');
    expect(loadSyncState().ownerId).toBeUndefined();
  });

  it('drops an id from before ids were signed, and its sync times with it', () => {
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: UNSIGNED, syncedAt: { profiles: 42, game: 7 } }));
    expect(loadSyncState()).toEqual({ syncedAt: { profiles: 0, game: 0 } });
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: UNSIGNED, syncedAt: 42 }));
    expect(loadSyncState()).toEqual({ syncedAt: { profiles: 0, game: 0 } });
  });

  it('round-trips the sync times and records one kind at a time', () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 42, game: 7 } });
    expect(loadSyncState()).toEqual({ ownerId: OWNER, syncedAt: { profiles: 42, game: 7 } });
    markSynced('game', 9);
    expect(loadSyncState().syncedAt).toEqual({ profiles: 42, game: 9 });
  });

});

describe('ensureOwnerId', () => {
  it('returns the stored id without asking the server', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 1, game: 2 } });
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await ensureOwnerId()).toBe(OWNER);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks the server once, even for concurrent callers, and keeps what it issues', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ ownerId: OWNER }, 201));
    vi.stubGlobal('fetch', fetch);
    const [a, b] = await Promise.all([ensureOwnerId(), ensureOwnerId()]);
    expect(a).toBe(OWNER);
    expect(b).toBe(OWNER);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([OWNER_API, expect.objectContaining({ method: 'POST' })]);
    expect(loadSyncState()).toEqual({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0 } });
  });

  it('resolves to undefined, and keeps nothing, when the server refuses or sends an unsigned id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Server is not configured.' }, 500)));
    expect(await ensureOwnerId()).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ownerId: UNSIGNED }, 201)));
    expect(await ensureOwnerId()).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await ensureOwnerId()).toBeUndefined();
    expect(loadSyncState().ownerId).toBeUndefined();
  });
});

describe('fetchRemote', () => {
  it('returns the data and timestamp the server sends, under the kind', async () => {
    const profiles = defaultProfileState();
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ profiles, updatedAt: 7 }));
    vi.stubGlobal('fetch', fetch);

    expect(await fetchRemote('profiles', OWNER)).toEqual({ data: profiles, updatedAt: 7 });
    expect(fetch.mock.calls[0][0]).toBe(`${SYNC_API.profiles}/${encodeURIComponent(OWNER)}`);
  });

  it('returns undefined on 404, bad bodies, and network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found.' }, 404)));
    expect(await fetchRemote('game', OWNER)).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ game: 'nope', updatedAt: 1 })));
    expect(await fetchRemote('game', OWNER)).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ profiles: {}, updatedAt: 1 })));
    expect(await fetchRemote('game', OWNER)).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await fetchRemote('profiles', OWNER)).toBeUndefined();
  });
});

describe('pushRemote', () => {
  it('PUTs the data under the kind and returns the server timestamp', async () => {
    const profiles = defaultProfileState();
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ updatedAt: 99 }));
    vi.stubGlobal('fetch', fetch);

    expect(await pushRemote('profiles', OWNER, profiles, true)).toBe(99);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${SYNC_API.profiles}/${encodeURIComponent(OWNER)}`);
    expect(init).toMatchObject({ method: 'PUT', keepalive: true });
    expect(JSON.parse(init.body)).toEqual({ profiles });
  });

  it('returns undefined when the write is refused or fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Body too large.' }, 413)));
    expect(await pushRemote('game', OWNER, {})).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await pushRemote('game', OWNER, {})).toBeUndefined();
  });
});
