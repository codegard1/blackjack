// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../lib/mongo';
import handler, { config } from '../functions/health';

const command = vi.fn();
const getDb = vi.fn(() => ({ command }));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => getDb(),
}));

afterEach(() => vi.restoreAllMocks());

describe('health function', () => {
  it('answers at /api/health', () => {
    expect(config.path).toBe('/api/health');
    expect(config.method).toBe('GET');
  });

  it('pings the database and reports ok', async () => {
    command.mockResolvedValueOnce({ ok: 1 });
    const response = await handler();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(command).toHaveBeenCalledWith({ ping: 1 });
  });

  it('reports missing configuration and an unreachable database without details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getDb.mockImplementationOnce(() => { throw new ConfigError('MONGODB_DB is not set'); });
    expect((await handler()).status).toBe(500);

    command.mockRejectedValueOnce(new Error('ECONNREFUSED 10.0.0.1'));
    const response = await handler();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('10.0.0.1');
  });
});
