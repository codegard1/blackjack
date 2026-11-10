import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerSW, type RegisterSWOptions } from 'virtual:pwa-register';
import { registerServiceWorker } from './registerServiceWorker';

vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function register(options?: ServiceWorkerRegistration) {
  registerServiceWorker();
  const callbacks = vi.mocked(registerSW).mock.calls[0][0] as RegisterSWOptions;
  callbacks.onRegisteredSW?.('/sw.js', options);
  return callbacks;
}

describe('registerServiceWorker', () => {
  it('registers immediately and checks for updates hourly and when back online', async () => {
    vi.useFakeTimers();
    const listeners = vi.spyOn(window, 'addEventListener');
    const update = vi.fn().mockResolvedValue(undefined);
    register({ update } as unknown as ServiceWorkerRegistration);

    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }));
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);

    const online = listeners.mock.calls.find(([event]) => event === 'online')?.[1] as EventListener;
    online(new Event('online'));
    expect(update).toHaveBeenCalledTimes(2);
    window.removeEventListener('online', online);
  });

  it('skips offline checks and tolerates a failed update', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { onLine: false });
    const listeners = vi.spyOn(window, 'addEventListener');
    const update = vi.fn().mockRejectedValue(new Error('Network unavailable'));
    register({ update } as unknown as ServiceWorkerRegistration);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', { onLine: true });
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(update).toHaveBeenCalledOnce();
    const online = listeners.mock.calls.find(([event]) => event === 'online')?.[1] as EventListener;
    window.removeEventListener('online', online);
  });

  it('does not schedule updates if registration is unavailable', () => {
    const interval = vi.spyOn(window, 'setInterval');
    const callbacks = register();
    expect(interval).not.toHaveBeenCalled();
    expect(() => callbacks.onRegisterError?.(new Error('Registration failed'))).not.toThrow();
  });
});
