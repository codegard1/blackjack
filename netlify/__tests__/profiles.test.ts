// @vitest-environment node
// Function tests live here rather than beside the functions: every file in
// netlify/functions is deployed as a function.
import type { Context } from '@netlify/functions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../lib/mongo';
import handler, { config } from '../functions/profiles';

const findOne = vi.fn();
const updateOne = vi.fn();
const getDb = vi.fn(() => ({ collection: () => ({ findOne, updateOne }) }));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => getDb(),
}));

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const profiles = { profiles: [{ id: 'chris', name: 'Chris', createdAt: 0, stats: { numberOfGamesPlayed: 1 } }], selectedId: 'chris', opponentIds: [] };

const call = (method: string, ownerId = OWNER, body?: unknown) => handler(
  new Request(`http://localhost/api/profiles/${ownerId}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  { params: { ownerId } } as unknown as Context,
);

afterEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockRestore();
});

describe('profiles function', () => {
  it('is routed by owner id for GET and PUT, with a rate limit', () => {
    expect(config.path).toBe('/api/profiles/:ownerId');
    expect(config.method).toEqual(['GET', 'PUT']);
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowLimit: 60 });
  });

  it('rejects an owner id of the wrong shape before touching the database', async () => {
    const response = await call('GET', 'nope');
    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });

  it('returns the stored profiles, or 404 when there are none', async () => {
    findOne.mockResolvedValueOnce({ _id: OWNER, profiles, updatedAt: 1700000000000, createdAt: 1 });
    const found = await call('GET');
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ profiles, updatedAt: 1700000000000 });
    expect(findOne).toHaveBeenCalledWith({ _id: OWNER });

    findOne.mockResolvedValueOnce(null);
    expect((await call('GET')).status).toBe(404);
  });

  it('upserts a valid body and returns the server timestamp', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000123);
    updateOne.mockResolvedValueOnce({ acknowledged: true });

    const response = await call('PUT', OWNER, { profiles });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedAt: 1700000000123 });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: OWNER },
      { $set: { profiles, updatedAt: 1700000000123 }, $setOnInsert: { createdAt: 1700000000123 } },
      { upsert: true },
    );
  });

  it('rejects a bad body without writing', async () => {
    expect((await call('PUT', OWNER, { profiles: { selectedId: 'x' } })).status).toBe(400);
    const big = await handler(
      new Request(`http://localhost/api/profiles/${OWNER}`, { method: 'PUT', headers: { 'content-length': String(1024 * 1024) }, body: '{}' }),
      { params: { ownerId: OWNER } } as unknown as Context,
    );
    expect(big.status).toBe(413);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('reports a missing configuration as 500 and a database failure as 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getDb.mockImplementationOnce(() => { throw new ConfigError('MONGODB_URI is not set'); });
    expect((await call('GET')).status).toBe(500);

    findOne.mockRejectedValueOnce(new Error('server selection timed out'));
    const response = await call('GET');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Database unavailable.' });
  });
});
