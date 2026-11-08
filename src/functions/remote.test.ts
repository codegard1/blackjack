import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../enums';
import { defaultProfileState } from './profiles';
import { fetchRemoteProfiles, loadSyncState, PROFILES_API, pushRemoteProfiles, saveSyncState } from './remote';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('loadSyncState', () => {
  it('creates a browser owner id once and keeps it', () => {
    const first = loadSyncState();
    expect(first.ownerId).toMatch(/^browser:[0-9a-f-]{32,36}$/);
    expect(first.syncedAt).toBe(0);
    expect(loadSyncState()).toEqual(first);
    expect(JSON.parse(localStorage.getItem(StoreName.SYNCSTORE) ?? '')).toEqual(first);
  });

  it('starts over when the saved state is unreadable', () => {
    localStorage.setItem(StoreName.SYNCSTORE, '{not json');
    expect(loadSyncState().ownerId).toMatch(/^browser:/);
    localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: 'github:1', syncedAt: 5 }));
    expect(loadSyncState().ownerId).toMatch(/^browser:/);
  });

  it('round-trips a saved sync time', () => {
    saveSyncState({ ownerId: OWNER, syncedAt: 42 });
    expect(loadSyncState()).toEqual({ ownerId: OWNER, syncedAt: 42 });
  });
});

describe('fetchRemoteProfiles', () => {
  it('returns the profiles and timestamp the server sends', async () => {
    const profiles = defaultProfileState();
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ profiles, updatedAt: 7 }));
    vi.stubGlobal('fetch', fetch);

    expect(await fetchRemoteProfiles(OWNER)).toEqual({ profiles, updatedAt: 7 });
    expect(fetch.mock.calls[0][0]).toBe(`${PROFILES_API}/${encodeURIComponent(OWNER)}`);
  });

  it('returns undefined on 404, bad bodies, and network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found.' }, 404)));
    expect(await fetchRemoteProfiles(OWNER)).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ profiles: 'nope' })));
    expect(await fetchRemoteProfiles(OWNER)).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await fetchRemoteProfiles(OWNER)).toBeUndefined();
  });
});

describe('pushRemoteProfiles', () => {
  it('PUTs the profiles and returns the server timestamp', async () => {
    const profiles = defaultProfileState();
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ updatedAt: 99 }));
    vi.stubGlobal('fetch', fetch);

    expect(await pushRemoteProfiles(OWNER, profiles, true)).toBe(99);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${PROFILES_API}/${encodeURIComponent(OWNER)}`);
    expect(init).toMatchObject({ method: 'PUT', keepalive: true });
    expect(JSON.parse(init.body)).toEqual({ profiles });
  });

  it('returns undefined when the write is refused or fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Body too large.' }, 413)));
    expect(await pushRemoteProfiles(OWNER, defaultProfileState())).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await pushRemoteProfiles(OWNER, defaultProfileState())).toBeUndefined();
  });
});
