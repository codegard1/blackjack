import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { StoreName } from '../../shared';
import { useTabLock } from './useTabLock';

const Probe: React.FC<{ onStatus: (status: boolean | null) => void }> = ({ onStatus }) => {
  const status = useTabLock();
  React.useEffect(() => {
    onStatus(status);
  }, [status, onStatus]);
  return <span data-testid="lock-status">{String(status)}</span>;
};

describe('useTabLock', () => {
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');

  afterEach(() => {
    if (originalLocks) {
      Object.defineProperty(navigator, 'locks', originalLocks);
    } else {
      delete (navigator as unknown as { locks?: unknown }).locks;
    }
    vi.restoreAllMocks();
  });

  it('defaults to active when Web Locks are unavailable', () => {
    delete (navigator as unknown as { locks?: unknown }).locks;
    const onStatus = vi.fn();
    render(<Probe onStatus={onStatus} />);
    expect(screen.getByTestId('lock-status')).toHaveTextContent('true');
  });

  it('shows a notice when another tab holds the lock and resumes once released', async () => {
    let queuedResolve: ((lock: unknown) => void) | undefined;
    const request = vi.fn((_name: string, options: LockOptions, callback: (lock: unknown) => Promise<void> | void) => {
      if (options.ifAvailable) {
        return Promise.resolve(callback(null));
      }
      return new Promise<void>((resolve) => {
        queuedResolve = (lock) => {
          void Promise.resolve(callback(lock)).then(() => resolve());
        };
      });
    });
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    render(<App />);
    await act(async () => {});

    expect(screen.getByText('The game is open in another tab')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start game' })).not.toBeInTheDocument();
    expect(localStorage.getItem(StoreName.GAMESTORE)).toBeNull();

    // First tab closes and releases the lock
    await act(async () => {
      queuedResolve?.({ name: 'blackjack-active-tab', mode: 'exclusive' });
      await Promise.resolve();
    });

    expect(screen.queryByText('The game is open in another tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
  });
});
