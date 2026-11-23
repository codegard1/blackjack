import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { settingDefaults } from '../context';
import { SettingsState } from '../types';
import { toRemoteSettings } from './persistence';
import { loadSyncState, saveSyncState, signInWithGoogle } from './remote';
import { SYNC_DEBOUNCE_MS } from './useRemoteSync';
import { settingReducer } from './settingReducer';
import { useSettingSync } from './useSettingSync';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c.c2lnbmVkLWJ5LXRoZS1zZXJ2ZXItZm9yLXRlc3RzLTAx';
const GOOGLE_OWNER = 'google:107691503500061507151.c2lnbmVkLWJ5LXRoZS1zZXJ2ZXItZm9yLXRlc3RzLTAx';
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function renderSync(initial: SettingsState, fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => {
    const [settings, dispatch] = React.useReducer(settingReducer, initial);
    useSettingSync(settings, dispatch, { enabled: true });
    return { settings, dispatch };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useSettingSync', () => {
  it('replaces local settings when the server copy is newer', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0, settings: 10 } });
    const remote: SettingsState = {
      ...settingDefaults,
      themeMode: 'dark',
      accent: 'teal',
      numberOfDecks: '6',
      isStrategyHintVisible: true,
    };
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ settings: toRemoteSettings(remote), updatedAt: 20 }));

    const { result } = renderSync(settingDefaults, fetch);
    await flush();

    expect(result.current.settings).toEqual(remote);
    expect(loadSyncState().syncedAt.settings).toBe(20);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/api/settings');
  });

  it('ignores a server copy of the wrong shape and pushes the local settings', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0, settings: 0 } });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ settings: { bogus: true }, updatedAt: 20 }))
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 21 }));
    const local: SettingsState = { ...settingDefaults, themeMode: 'dark' };

    const { result } = renderSync(local, fetch);
    await flush();

    expect(result.current.settings).toEqual(local);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ settings: toRemoteSettings(local) });
    expect(loadSyncState().syncedAt.settings).toBe(21);
  });

  it('sends a later setting change once it settles, and ignores toggling the options drawer', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0, settings: 0 } });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Not found.' }, 404))
      .mockResolvedValue(jsonResponse({ updatedAt: 6 }));

    const { result } = renderSync(settingDefaults, fetch);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.useFakeTimers();
    act(() => result.current.dispatch({ key: 'isOptionsPanelVisible', value: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(2);

    act(() => result.current.dispatch({ key: 'themeMode', value: 'dark' }));
    act(() => result.current.dispatch({ key: 'dealerSoft17', value: 'hit' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(3);
    const sent = JSON.parse(fetch.mock.calls[2][1].body).settings;
    expect(sent).toMatchObject({ themeMode: 'dark', dealerSoft17: 'hit' });
    expect(sent).not.toHaveProperty('isOptionsPanelVisible');
  });

  it('loads the Google account settings when signing in', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0, settings: 5 } });
    const accountSettings: SettingsState = {
      ...settingDefaults,
      themeMode: 'dark',
      cardStyle: 'bold',
      blackjackPayout: '6:5',
      isStrategyHintVisible: true,
    };
    const user = { name: 'Chris Odegard', email: 'chris@example.com' };
    const fetch = vi.fn()
      // 1. Initial anonymous GET /api/settings
      .mockResolvedValueOnce(jsonResponse({ settings: toRemoteSettings(settingDefaults), updatedAt: 10 }))
      // 2. POST /api/owner for Google sign-in
      .mockResolvedValueOnce(jsonResponse({ ownerId: GOOGLE_OWNER, user }, 200))
      // 3. GET /api/settings for Google ownerId
      .mockResolvedValueOnce(jsonResponse({ settings: toRemoteSettings(accountSettings), updatedAt: 100 }));

    const { result } = renderSync(settingDefaults, fetch);
    await flush();

    await act(async () => {
      await signInWithGoogle('google.jwt.token');
    });
    await flush();
    await flush();

    expect(result.current.settings).toEqual(accountSettings);
    expect(loadSyncState().syncedAt.settings).toBe(100);
  });

  it('pushes local settings to the Google account on first sign-in when none are saved yet', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0, settings: 5 } });
    const local: SettingsState = { ...settingDefaults, themeMode: 'dark', queueSide: 'right' };
    const user = { name: 'Chris Odegard', email: 'chris@example.com' };
    const fetch = vi.fn()
      // 1. Initial anonymous GET /api/settings
      .mockResolvedValueOnce(jsonResponse({ settings: toRemoteSettings(local), updatedAt: 10 }))
      // 2. POST /api/owner for Google sign-in
      .mockResolvedValueOnce(jsonResponse({ ownerId: GOOGLE_OWNER, user }, 200))
      // 3. GET /api/settings for Google ownerId (not found yet)
      .mockResolvedValueOnce(jsonResponse({ error: 'Not found.' }, 404))
      // 4. PUT /api/settings under Google ownerId
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 105 }));

    renderSync(local, fetch);
    await flush();

    await act(async () => {
      await signInWithGoogle('google.jwt.token');
    });
    await flush();
    await flush();

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[3][0]).toBe('/api/settings');
    expect(fetch.mock.calls[3][1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: `Bearer ${GOOGLE_OWNER}` }),
    });
    expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({ settings: toRemoteSettings(local) });
    expect(loadSyncState().syncedAt.settings).toBe(105);
  });
});
