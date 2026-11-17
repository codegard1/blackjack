// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../lib/mongo';
import { mintOwnerId } from '../lib/owner';
import aggregate, { config as aggregateConfig } from '../functions/aggregate-npc-stats';
import handler, { config } from '../functions/npc-stats';

const readNpcStats = vi.fn();
const aggregateNpcStats = vi.fn();
const getDb = vi.fn(() => ({}));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => getDb(),
}));
vi.mock('../lib/aggregate', () => ({
  readNpcStats: (...args: unknown[]) => readNpcStats(...args),
  aggregateNpcStats: (...args: unknown[]) => aggregateNpcStats(...args),
}));

const SECRET = 'correct-horse-battery-staple-2026';
const OWNER = mintOwnerId('browser', SECRET);
const found = { generatedAt: 7, stats: { ogion: { numberOfGamesPlayed: 16 } }, counted: {} };

const call = (ownerId = OWNER) => handler(
  new Request('http://localhost/api/npc-stats', { headers: { Authorization: `Bearer ${ownerId}` } }),
);

beforeEach(() => vi.stubEnv('OWNER_ID_SECRET', SECRET));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('npc-stats function', () => {
  it('is a rate limited GET with no owner id in its address', () => {
    expect(config.path).toBe('/api/npc-stats');
    expect(config.method).toBe('GET');
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'] });
  });

  it('refuses owner ids of the wrong shape or that the server did not issue', async () => {
    expect((await call('nope')).status).toBe(400);
    expect((await call('browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c')).status).toBe(403);
    expect(readNpcStats).not.toHaveBeenCalled();
  });

  it('returns the sums for the asking owner, or 404 before the first run', async () => {
    readNpcStats.mockResolvedValueOnce(found);
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual(found);
    expect(readNpcStats).toHaveBeenCalledWith(expect.anything(), OWNER);

    readNpcStats.mockResolvedValueOnce(undefined);
    expect((await call()).status).toBe(404);
  });

  it('answers 500 without configuration and 503 when the database fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getDb.mockImplementationOnce(() => { throw new ConfigError('MONGODB_URI is not set'); });
    expect((await call()).status).toBe(500);
    readNpcStats.mockRejectedValueOnce(new Error('down'));
    expect((await call()).status).toBe(503);
  });
});

describe('aggregate-npc-stats function', () => {
  it('runs monthly and has no route', () => {
    expect(aggregateConfig).toEqual({ schedule: '@monthly' });
  });

  it('runs the aggregation and logs the outcome', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    aggregateNpcStats.mockResolvedValueOnce({ owners: { seen: 3, changed: 2, refused: 1 } });
    await aggregate();
    expect(aggregateNpcStats).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('aggregate-npc-stats: read 3 owners, 2 added play, 1 had stats refused');
  });

  it('fails loudly so the run shows as failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    aggregateNpcStats.mockRejectedValueOnce(new Error('down'));
    await expect(aggregate()).rejects.toThrow('down');
  });
});
