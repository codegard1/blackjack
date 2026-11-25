import React from 'react';
import { debugLog } from '../debugLog';
import { ensureOwnerId, fetchRemote, loadSyncState, markSynced, pushRemote, subscribeSyncState, SyncKind } from './remote';

/** How long changes are allowed to settle before they are sent */
export const SYNC_DEBOUNCE_MS = 1500;

export type RemoteSyncOptions<T> = {
  kind: SyncKind;
  /** the live local value */
  value: T;
  /** what is sent to the server for a value; the value itself by default */
  toRemote?: (value: T) => unknown;
  /** what the local value becomes when a server copy is applied, or undefined to refuse it */
  preview: (remote: unknown) => T | undefined;
  /** combine a server copy with anonymous local progress on first Google sign-in */
  merge?: (remote: unknown, local: T) => T | undefined;
  /** apply the server copy, usually a dispatch */
  replace: (remote: unknown) => void;
  /** off during tests, where there is no server; tests of the hook turn it on */
  enabled?: boolean;
};

const identity = (value: unknown): unknown => value;

/**
 * Keep one kind of state in step with the server. On mount (and whenever the user
 * signs in or out), the server's copy replaces the local one when it is newer than
 * what this browser last synced; otherwise the local copy is sent. When signing in
 * with Google from an anonymous browser, `merge` combines anonymous local progress
 * with the account's remote copy and pushes the combined result. After that every
 * change is sent once it settles, and a final push is attempted when the page is
 * hidden. Failures are silent: the browser copy is the fallback and nothing in the
 * game waits on the network.
 */
export function useRemoteSync<T>({
  kind,
  value,
  toRemote = identity,
  preview,
  merge,
  replace,
  enabled = import.meta.env.MODE !== 'test',
}: RemoteSyncOptions<T>): void {
  // the latest value and callbacks, for the timers and requests that outlive a render
  const latest = React.useRef(value);
  const callbacks = React.useRef({ toRemote, preview, merge, replace });
  React.useLayoutEffect(() => {
    latest.current = value;
    callbacks.current = { toRemote, preview, merge, replace };
  });
  /** JSON of the last remote form known to match the server, so echoes are not sent back */
  const synced = React.useRef<string | undefined>(undefined);
  const ready = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);
  const [authRevision, setAuthRevision] = React.useState(0);

  React.useEffect(() => subscribeSyncState(() => setAuthRevision((n) => n + 1)), []);

  const push = React.useCallback(async (keepalive = false) => {
    const remoteForm = callbacks.current.toRemote(latest.current);
    const serialized = JSON.stringify(remoteForm);
    if (serialized === synced.current) return;
    const ownerId = await ensureOwnerId();
    if (ownerId === undefined) {
      debugLog(`${kind} sync: no owner id yet; will retry on the next change`);
      return;
    }
    const updatedAt = await pushRemote(kind, ownerId, remoteForm, keepalive);
    if (updatedAt === undefined) {
      debugLog(`${kind} sync: push failed; will retry on the next change`);
      return;
    }
    synced.current = serialized;
    markSynced(kind, updatedAt);
  }, [kind]);

  // First contact with the server (or after signing in / out) decides which copy wins
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    ready.current = false;
    synced.current = undefined;
    window.clearTimeout(timer.current);
    timer.current = undefined;

    void (async () => {
      const ownerId = await ensureOwnerId();
      if (cancelled || ownerId === undefined) return;
      const { syncedAt, mergeAnonymous } = loadSyncState();
      const remote = await fetchRemote(kind, ownerId);
      if (cancelled) return;

      if (remote && mergeAnonymous && callbacks.current.merge) {
        const merged = callbacks.current.merge(remote.data, latest.current);
        const remoteOnly = callbacks.current.preview(remote.data);
        if (merged !== undefined && remoteOnly !== undefined) {
          const mergedForm = callbacks.current.toRemote(merged);
          const remoteForm = callbacks.current.toRemote(remoteOnly);
          const serializedMerged = JSON.stringify(mergedForm);
          synced.current = serializedMerged;
          markSynced(kind, remote.updatedAt);
          callbacks.current.replace(merged);
          if (serializedMerged !== JSON.stringify(remoteForm)) {
            const pushedAt = await pushRemote(kind, ownerId, mergedForm);
            if (!cancelled && pushedAt !== undefined) markSynced(kind, pushedAt);
          }
          ready.current = true;
          return;
        }
      }

      const next = remote && remote.updatedAt > syncedAt[kind] ? callbacks.current.preview(remote.data) : undefined;
      if (remote && next !== undefined) {
        synced.current = JSON.stringify(callbacks.current.toRemote(next));
        markSynced(kind, remote.updatedAt);
        callbacks.current.replace(remote.data);
      } else {
        await push();
      }
      ready.current = true;
    })();
    return () => { cancelled = true; };
  }, [enabled, kind, push, authRevision]);

  // Later changes are sent once they settle
  React.useEffect(() => {
    if (!enabled || !ready.current) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      void push();
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer.current);
  }, [enabled, value, push]);

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
