import React from 'react';
import { debugLog } from './debugLog';
import { ensureOwnerId, fetchRemote, loadSyncState, markSynced, pushRemote, SyncKind } from './remote';

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
  /** apply the server copy, usually a dispatch */
  replace: (remote: unknown) => void;
  /** off during tests, where there is no server; tests of the hook turn it on */
  enabled?: boolean;
};

const identity = (value: unknown): unknown => value;

/**
 * Keep one kind of state in step with the server. On mount, the server's copy
 * replaces the local one when it is newer than what this browser last synced;
 * otherwise the local copy is sent. After that every change is sent once it settles,
 * and a final push is attempted when the page is hidden. Failures are silent: the
 * browser copy is the fallback and nothing in the game waits on the network. Until
 * the server has issued this browser an owner id nothing is sent.
 */
export function useRemoteSync<T>({
  kind,
  value,
  toRemote = identity,
  preview,
  replace,
  enabled = import.meta.env.MODE !== 'test',
}: RemoteSyncOptions<T>): void {
  const latest = React.useRef(value);
  latest.current = value;
  const callbacks = React.useRef({ toRemote, preview, replace });
  callbacks.current = { toRemote, preview, replace };
  /** JSON of the last remote form known to match the server, so echoes are not sent back */
  const synced = React.useRef<string | undefined>(undefined);
  const ready = React.useRef(false);
  const timer = React.useRef<number | undefined>(undefined);

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

  // First contact with the server decides which copy wins
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const ownerId = await ensureOwnerId();
      if (cancelled || ownerId === undefined) return;
      const { syncedAt } = loadSyncState();
      const remote = await fetchRemote(kind, ownerId);
      if (cancelled) return;
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
  }, [enabled, kind, push]);

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
