import React from 'react';

const LOCK_NAME = 'blackjack-active-tab';

/**
 * Coordinates single-tab ownership using the Web Locks API so two tabs do not
 * overwrite each other's saved state or push conflicting cloud sync updates.
 * Returns `true` when this tab holds the lock (or when Web Locks are unavailable),
 * `false` when another tab holds it, or `null` while the initial check is pending.
 */
export function useTabLock(lockName = LOCK_NAME): boolean | null {
  const supportsLocks = typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
  const [hasLock, setHasLock] = React.useState<boolean | null>(() => (supportsLocks ? null : true));

  React.useEffect(() => {
    if (!supportsLocks) return;

    let cancelled = false;
    let releaseLock: (() => void) | undefined;
    const controller = new AbortController();

    const holdLock = () => new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const acquireQueued = () => {
      navigator.locks.request(lockName, { signal: controller.signal }, () => {
        if (cancelled) return;
        setHasLock(true);
        return holdLock();
      }).catch(() => {
        // Aborted on unmount before acquiring the lock.
      });
    };

    navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
      if (cancelled) return;
      if (lock) {
        setHasLock(true);
        return holdLock();
      }
      setHasLock(false);
      acquireQueued();
    }).catch(() => {
      if (!cancelled) setHasLock(true);
    });

    return () => {
      cancelled = true;
      controller.abort();
      releaseLock?.();
    };
  }, [lockName, supportsLocks]);

  return hasLock;
}
