// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settingDefaults } from '../../src/types/SettingState';
import { resetIndexes } from '../lib/handler';
import { ConfigError } from '../lib/mongo';
import { mintOwnerId } from '../lib/owner';
import handler, { config } from '../functions/settings';

const findOne = vi.fn();
const updateOne = vi.fn();
const createIndex = vi.fn();
const updateMany = vi.fn();
const getDb = vi.fn(() => ({ collection: () => ({ findOne, updateOne, updateMany, createIndex, dbName: 'blackjack', collectionName: 'settings' }) }));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => getDb(),
}));

const SECRET = 'correct-horse-battery-staple-2026';
const OWNER = mintOwnerId('google', SECRET, '107691503500061507151');
const UNSIGNED = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const { isOptionsPanelVisible: _, ...remoteDefaults } = settingDefaults;
const settings = { ...remoteDefaults, themeMode: 'dark', numberOfDecks: '6', isStrategyHintVisible: true };

const call = (method: string, ownerId = OWNER, body?: unknown) => handler(
  new Request('http://localhost/api/settings', {
    method,
    headers: { Authorization: `Bearer ${ownerId}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
);

beforeEach(() => {
  vi.stubEnv('OWNER_ID_SECRET', SECRET);
  createIndex.mockResolvedValue('expire-stale');
  updateMany.mockResolvedValue({ acknowledged: true });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetIndexes();
});

describe('settings function', () => {
  it('is routed at /api/settings for GET and PUT, with a rate limit', () => {
    expect(config.path).toBe('/api/settings');
    expect(config.method).toEqual(['GET', 'PUT']);
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowLimit: 60 });
  });

  it('refuses an unsigned or unknown owner id', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await call('GET', 'nope')).status).toBe(400);
    expect((await call('GET', UNSIGNED)).status).toBe(403);
    expect((await call('PUT', UNSIGNED, { settings })).status).toBe(403);
    expect(findOne).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('returns the stored settings with no-store, or 404 when there are none', async () => {
    findOne.mockResolvedValueOnce({ _id: OWNER, settings, updatedAt: 1700000000000, createdAt: 1 });
    const found = await call('GET');
    expect(found.status).toBe(200);
    expect(found.headers.get('cache-control')).toBe('no-store');
    expect(await found.json()).toEqual({ settings, updatedAt: 1700000000000 });

    findOne.mockResolvedValueOnce(null);
    expect((await call('GET')).status).toBe(404);
  });

  it('upserts valid settings with the write time', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000456);
    updateOne.mockResolvedValue({ acknowledged: true });

    const response = await call('PUT', OWNER, { settings: { ...settings, isOptionsPanelVisible: true, extra: 'ignored' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedAt: 1700000000456 });
    expect(updateOne).toHaveBeenCalledWith(
      { _id: OWNER },
      { $set: { settings, updatedAt: 1700000000456, touchedAt: new Date(1700000000456) }, $setOnInsert: { createdAt: 1700000000456 } },
      { upsert: true },
    );
  });

  it('rejects a bad body without writing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await call('PUT', OWNER, { settings: { themeMode: 'neon' } })).status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('reports a missing configuration as 500 and a database failure as 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getDb.mockImplementationOnce(() => { throw new ConfigError('MONGODB_URI is not set'); });
    expect((await call('GET')).status).toBe(500);

    findOne.mockRejectedValueOnce(new Error('server selection timed out'));
    expect((await call('GET')).status).toBe(503);
  });
});
