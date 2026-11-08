// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError, getClient, getDb, readConfig, resetClient } from './mongo';

const URI = 'mongodb://localhost:27017';

afterEach(() => {
  vi.unstubAllEnvs();
  resetClient();
});

describe('readConfig', () => {
  it('names the missing variable', () => {
    expect(() => readConfig({})).toThrow(new ConfigError('MONGODB_URI is not set'));
    expect(() => readConfig({ MONGODB_URI: URI })).toThrow(new ConfigError('MONGODB_DB is not set'));
    expect(readConfig({ MONGODB_URI: URI, MONGODB_DB: 'blackjack' })).toEqual({ uri: URI, dbName: 'blackjack' });
  });
});

describe('getClient', () => {
  it('builds one client and reuses it until reset', () => {
    vi.stubEnv('MONGODB_URI', URI);
    vi.stubEnv('MONGODB_DB', 'blackjack');

    const first = getClient();
    expect(getClient()).toBe(first);
    expect(getDb().databaseName).toBe('blackjack');

    resetClient();
    expect(getClient()).not.toBe(first);
  });

  it('throws a ConfigError without a connection string', () => {
    vi.stubEnv('MONGODB_URI', '');
    expect(() => getClient()).toThrow(ConfigError);
  });
});
