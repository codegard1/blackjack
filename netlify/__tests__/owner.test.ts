// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { config } from '../functions/owner';
import { verifyOwnerId } from '../lib/owner';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('owner function', () => {
  it('answers POST /api/owner with a tight rate limit', () => {
    expect(config.path).toBe('/api/owner');
    expect(config.method).toBe('POST');
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowSize: 180, windowLimit: 2 });
  });

  it('issues a signed browser id', async () => {
    vi.stubEnv('OWNER_ID_SECRET', 'correct-horse-battery-staple-2026');
    const response = await handler();
    expect(response.status).toBe(201);
    const { ownerId } = await response.json();
    expect(ownerId).toMatch(/^browser:/);
    expect(verifyOwnerId(ownerId)).toBe(true);
  });

  it('reports a missing secret without issuing anything', async () => {
    vi.stubEnv('OWNER_ID_SECRET', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handler();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server is not configured.' });
  });
});
