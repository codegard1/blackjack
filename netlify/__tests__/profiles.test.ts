// @vitest-environment node
// Function tests live here rather than beside the functions: every file in
// netlify/functions is deployed as a function.
import type { Context } from '@netlify/functions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIndexes, STALE_AFTER_DAYS, STALE_INDEX } from '../lib/handler';
import { ConfigError } from '../lib/mongo';
import { mintOwnerId } from '../lib/owner';
import handler, { config } from '../functions/profiles';

const findOne = vi.fn();
const updateOne = vi.fn();
const createIndex = vi.fn();
const updateMany = vi.fn();
const getDb = vi.fn(() => ({ collection: () => ({ findOne, updateOne, updateMany, createIndex, dbName: 'blackjack', collectionName: 'profiles' }) }));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => getDb(),
}));

const SECRET = 'correct-horse-battery-staple-2026';
const OWNER = mintOwnerId('browser', SECRET);
const UNSIGNED = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const profiles = { profiles: [{ id: 'chris', name: 'Chris', createdAt: 0, stats: { numberOfGamesPlayed: 1 } }], selectedId: 'chris', opponentIds: [] };

const call = (method: string, ownerId = OWNER, body?: unknown) => handler(
  new Request(`http://localhost/api/profiles/${ownerId}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  { params: { ownerId } } as unknown as Context,
);

beforeEach(() => {
  vi.stubEnv('OWNER_ID_SECRET', SECRET);
  createIndex.mockResolvedValue(STALE_INDEX);
  updateMany.mockResolvedValue({ acknowledged: true });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetIndexes();
});

describe('profiles function', () => {
  it('is routed with and without the owner id for GET and PUT, with a rate limit', () => {
    expect(config.path).toEqual(['/api/profiles', '/api/profiles/:ownerId']);
    expect(config.method).toEqual(['GET', 'PUT']);
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowLimit: 60 });
  });

  it('rejects an owner id of the wrong shape before touching the database, and logs it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await call('GET', 'nope');
    expect(response.status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('profiles: GET rejected with 400: Invalid owner id.');
    expect((await call('GET', 'browser:%E0%A4%A')).status).toBe(400);
  });

  it('refuses an owner id the server did not issue, for reads and writes', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await call('GET', UNSIGNED)).status).toBe(403);
    expect((await call('PUT', UNSIGNED, { profiles })).status).toBe(403);
    expect((await call('PUT', mintOwnerId('browser', 'some-other-secret-value'), { profiles })).status).toBe(403);
    expect(findOne).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('takes the owner id from the Authorization header, ahead of the route', async () => {
    findOne.mockResolvedValueOnce({ _id: OWNER, profiles, updatedAt: 5, createdAt: 1 });
    const bearer = (ownerId: string, params: Record<string, string> = {}) => handler(
      new Request('http://localhost/api/profiles', { headers: { Authorization: `Bearer ${ownerId}` } }),
      { params } as unknown as Context,
    );
    const response = await bearer(OWNER);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(findOne).toHaveBeenCalledWith({ _id: OWNER });

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await bearer(UNSIGNED, { ownerId: OWNER })).status).toBe(403);
    expect((await handler(new Request('http://localhost/api/profiles'), { params: {} } as unknown as Context)).status).toBe(400);
  });

  it('still accepts the owner id in the route, as older clients send it, with the colon percent-encoded', async () => {
    findOne.mockResolvedValueOnce(null);
    const response = await call('GET', encodeURIComponent(OWNER));
    expect(response.status).toBe(404);
    expect(findOne).toHaveBeenCalledWith({ _id: OWNER });
  });

  it('returns the stored profiles, or 404 when there are none', async () => {
    findOne.mockResolvedValueOnce({ _id: OWNER, profiles, updatedAt: 1700000000000, createdAt: 1 });
    const found = await call('GET');
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ profiles, updatedAt: 1700000000000 });

    findOne.mockResolvedValueOnce(null);
    expect((await call('GET')).status).toBe(404);
  });

  it('upserts a valid body with the write time, after making sure stale documents expire', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000123);
    updateOne.mockResolvedValue({ acknowledged: true });

    const response = await call('PUT', OWNER, { profiles });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedAt: 1700000000123 });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: OWNER },
      { $set: { profiles, updatedAt: 1700000000123, touchedAt: new Date(1700000000123) }, $setOnInsert: { createdAt: 1700000000123 } },
      { upsert: true },
    );
    expect(createIndex).toHaveBeenCalledWith({ touchedAt: 1 }, { name: STALE_INDEX, expireAfterSeconds: STALE_AFTER_DAYS * 24 * 60 * 60 });
    // documents from before the index carry only the numeric time; give them a date so they expire too
    expect(updateMany).toHaveBeenCalledWith({ touchedAt: { $exists: false } }, [{ $set: { touchedAt: { $toDate: '$updatedAt' } } }]);

    await call('PUT', OWNER, { profiles });
    expect(createIndex).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('still writes when the index cannot be ensured, and tries again next time', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    createIndex.mockRejectedValueOnce(new Error('not authorized'));
    updateOne.mockResolvedValue({ acknowledged: true });
    expect((await call('PUT', OWNER, { profiles })).status).toBe(200);
    expect(error).toHaveBeenCalled();
    expect((await call('PUT', OWNER, { profiles })).status).toBe(200);
    expect(createIndex).toHaveBeenCalledTimes(2);
  });

  it('rejects a bad body without writing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

    vi.stubEnv('OWNER_ID_SECRET', '');
    expect((await call('GET')).status).toBe(500);
    vi.stubEnv('OWNER_ID_SECRET', SECRET);

    findOne.mockRejectedValueOnce(new Error('server selection timed out'));
    const response = await call('GET');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Database unavailable.' });
  });
});
