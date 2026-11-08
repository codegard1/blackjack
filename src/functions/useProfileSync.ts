import React from 'react';
import { IProfileAction } from '../interfaces';
import { ProfileState } from '../types';
import { debugLog } from './debugLog';
import { profileReducer } from './profiles';
import { fetchRemoteProfiles, loadSyncState, pushRemoteProfiles, saveSyncState } from './remote';

/** How long profile changes are allowed to settle before they are sent */
export const SYNC_DEBOUNCE_MS = 1500;

type Options = {
  /** off during tests, where there is no server; tests of the hook turn it on */
  enabled?: boolean;
};

/**
 * Keep the profiles in step with the server. On mount, the server's copy replaces the
 * local one when it is newer than what this browser last synced; otherwise the local
 * copy is sent. After that every change is sent once it settles, and a final push is
 * attempted when the page is hidden. Failures are silent: the browser copy is the
 * fallback and nothing in the game waits on the network.
 */
export function useProfileSync(
  profiles: ProfileState,
  dispatch: React.Dispatch<IProfileAction>,
  { enabled = import.meta.env.MODE !== 'test' }: Options = {},
): void {
  const latest = React.useRef(profiles);
  latest.current = profiles;
  /** JSON of the last state known to match the server, so echoes are not sent back */
  const synced = React.useRef<string | undefined>(undefined);
  const ready = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);

  const push = React.useCallback(async (keepalive = false) => {
    const state = latest.current;
    const serialized = JSON.stringify(state);
    if (serialized === synced.current) return;
    const { ownerId } = loadSyncState();
    const updatedAt = await pushRemoteProfiles(ownerId, state, keepalive);
    if (updatedAt === undefined) {
      debugLog('profile sync: push failed; will retry on the next change');
      return;
    }
    synced.current = serialized;
    saveSyncState({ ownerId, syncedAt: updatedAt });
  }, []);

  // First contact with the server decides which copy wins
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const { ownerId, syncedAt } = loadSyncState();
      const remote = await fetchRemoteProfiles(ownerId);
      if (cancelled) return;
      if (remote && remote.updatedAt > syncedAt) {
        // the reducer normalizes what it is given; remember exactly what it will produce
        synced.current = JSON.stringify(profileReducer(latest.current, { type: 'replace', state: remote.profiles }));
        saveSyncState({ ownerId, syncedAt: remote.updatedAt });
        dispatch({ type: 'replace', state: remote.profiles });
      } else {
        await push();
      }
      ready.current = true;
    })();
    return () => { cancelled = true; };
  }, [enabled, dispatch, push]);

  // Later changes are sent once they settle
  React.useEffect(() => {
    if (!enabled || !ready.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      void push();
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer.current);
  }, [enabled, profiles, push]);

  // A pending change is sent at once when the page goes away
  React.useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (timer.current === undefined) return;
      window.clearTimeout(timer.current);
      timer.current = undefined;
      void push(true);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [enabled, push]);
}
