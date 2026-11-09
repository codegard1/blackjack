import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../enums';
import { defaultProfileState } from './profiles';
import { fetchRemote, loadSyncState, markSynced, pushRemote, saveSyncState, SYNC_API } from './remote';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('loadSyncState', () => {
  it('creates a browser owner id once and keeps it', () => {
    const first = loadSyncState();
    expect(first.ownerId).toMatch(/^browser:[0-9a-f-]{32,36}$/);
    expect(first.syncedAt).toEqual({ profiles: 0, game: 0 });
    expect(loadSyncState()).toEqual(first);
    expect(JSON.parse(localStorage.getItem(StoreName.SYNCSTORE) ?? '')).toEqual(first);
  });

  it('starts over when the saved state is unreadable', () => {
    localStorage.setItem(StoreName.SYNCSTORE, '{not json');
    expect(loadSyncState().ownerId).toMatch(/^browser:/);
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: 'github:1', syncedAt: 5 }));
    expect(loadSyncState().ownerId).toMatch(/^browser:/);
  });

  it('round-trips the sync times and records one kind at a time', () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 42, game: 7 } });
    expect(loadSyncState()).toEqual({ ownerId: OWNER, syncedAt: { profiles: 42, game: 7 } });
    markSynced('game', 9);
    expect(loadSyncState().syncedAt).toEqual({ profiles: 42, game: 9 });
  });

  it('reads the first release, which kept a single profiles time', () => {
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: OWNER, syncedAt: 42 }));
    expect(loadSyncState()).toEqual({ ownerId: OWNER, syncedAt: { profiles: 42, game: 0 } });
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
