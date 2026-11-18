// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { config } from '../functions/owner';
import * as google from '../lib/google';
import { verifyOwnerId } from '../lib/owner';

const SECRET = 'correct-horse-battery-staple-2026';
const CLIENT_ID = '1234567890-abcdef.apps.googleusercontent.com';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('owner function', () => {
  it('answers POST /api/owner with a tight rate limit', () => {
    expect(config.path).toBe('/api/owner');
    expect(config.method).toBe('POST');
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowSize: 180, windowLimit: 10 });
  });

  it('issues a signed browser id when called with an empty body', async () => {
    vi.stubEnv('OWNER_ID_SECRET', SECRET);
    const response = await handler();
    expect(response.status).toBe(201);
    const { ownerId } = await response.json();
    expect(ownerId).toMatch(/^browser:/);
    expect(verifyOwnerId(ownerId)).toBe(true);
  });

  it('issues a deterministic signed google owner id and user profile for a valid credential', async () => {
    vi.stubEnv('OWNER_ID_SECRET', SECRET);
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
    vi.spyOn(google, 'verifyGoogleCredential').mockResolvedValue({
      sub: '107691503500061507151',
      name: 'Chris Odegard',
      email: 'chris@example.com',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    });

    const req = () => new Request('http://localhost/api/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'valid.jwt.token' }),
    });

    const first = await handler(req());
    const second = await handler(req());
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.ownerId).toBe(secondBody.ownerId);
    expect(firstBody.ownerId).toMatch(/^google:107691503500061507151\./);
    expect(verifyOwnerId(firstBody.ownerId, SECRET)).toBe(true);
    expect(firstBody.user).toEqual({
      name: 'Chris Odegard',
      email: 'chris@example.com',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    });
  });

  it('rejects malformed or invalid Google credential requests', async () => {
    vi.stubEnv('OWNER_ID_SECRET', SECRET);
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', CLIENT_ID);
    vi.spyOn(google, 'verifyGoogleCredential').mockResolvedValue(undefined);

    const badJson = await handler(new Request('http://localhost/api/owner', { method: 'POST', body: '{nope' }));
    expect(badJson.status).toBe(400);

    const missingCred = await handler(new Request('http://localhost/api/owner', { method: 'POST', body: '{}' }));
    expect(missingCred.status).toBe(400);

    const invalidCred = await handler(new Request('http://localhost/api/owner', {
      method: 'POST',
      body: JSON.stringify({ credential: 'expired.jwt.token' }),
    }));
    expect(invalidCred.status).toBe(401);
    expect(await invalidCred.json()).toEqual({ error: 'Invalid Google credential.' });
  });

  it('reports a missing secret without issuing anything', async () => {
    vi.stubEnv('OWNER_ID_SECRET', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handler();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Server is not configured.' });
  });
});
