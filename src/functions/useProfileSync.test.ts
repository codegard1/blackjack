import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IProfileAction } from '../interfaces';
import { ProfileState } from '../types';
import { defaultProfileState, profileReducer } from './profiles';
import { loadSyncState, saveSyncState } from './remote';
import { SYNC_DEBOUNCE_MS, useProfileSync } from './useProfileSync';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

/** Render the hook over a real reducer so dispatched actions change the profiles */
function renderSync(initial: ProfileState, fetch: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetch);
  return renderHook(() => {
    const [profiles, dispatch] = React.useReducer(profileReducer, initial);
    useProfileSync(profiles, dispatch, { enabled: true });
    return { profiles, dispatch: dispatch as React.Dispatch<IProfileAction> };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useProfileSync', () => {
  it('replaces the local profiles when the server copy is newer', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: 10 });
    const remote = profileReducer(defaultProfileState(), { type: 'create', name: 'Remote' });
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ profiles: remote, updatedAt: 20 }));

    const { result } = renderSync(defaultProfileState(), fetch);
    await flush();

    expect(result.current.profiles.profiles.some((profile) => profile.name === 'Remote')).toBe(true);
    expect(loadSyncState().syncedAt).toBe(20);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('pushes the local profiles when the server has nothing newer', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: 0 });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Not found.' }, 404))
      .mockResolvedValueOnce(jsonResponse({ updatedAt: 5 }));

    const { result } = renderSync(defaultProfileState(), fetch);
    await flush();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ profiles: result.current.profiles });
    expect(loadSyncState().syncedAt).toBe(5);
  });

  it('sends a later change once it settles, and not an unchanged state', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: 0 });
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Not found.' }, 404))
      .mockResolvedValue(jsonResponse({ updatedAt: 6 }));
    const { result } = renderSync(defaultProfileState(), fetch);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.useFakeTimers();
    act(() => result.current.dispatch({ type: 'create', name: 'Alex' }));
    act(() => result.current.dispatch({ type: 'toggleOpponent', id: 'ogion' }));
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(3);
    const sent = JSON.parse(fetch.mock.calls[2][1].body).profiles as ProfileState;
    expect(sent.profiles.some((profile) => profile.name === 'Alex')).toBe(true);
    expect(sent.opponentIds).toEqual(['ogion']);

    // a dispatch that leaves the state as it is sends nothing
    act(() => result.current.dispatch({ type: 'select', id: 'nobody' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SYNC_DEBOUNCE_MS); });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('keeps working offline and pushes pending changes when the page is hidden', async () => {
    saveSyncState({ ownerId: OWNER, syncedAt: 0 });
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderSync(defaultProfileState(), fetch);
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.useFakeTimers();
    act(() => result.current.dispatch({ type: 'create', name: 'Alex' }));
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1]).toMatchObject({ method: 'PUT', keepalive: true });
    expect(result.current.profiles.profiles.some((profile) => profile.name === 'Alex')).toBe(true);
  });
});
