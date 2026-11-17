// @vitest-environment node
import { MongoServerSelectionError, TopologyClosedEvent } from 'mongodb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLIENT_OPTIONS, ConfigError, getClient, getDb, readConfig, resetClient } from './mongo';

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

  it('drops a client whose topology has closed', () => {
    vi.stubEnv('MONGODB_URI', URI);
    vi.stubEnv('MONGODB_DB', 'blackjack');

    const first = getClient();
    first.emit('topologyClosed', new TopologyClosedEvent());
    const second = getClient();
    expect(second).not.toBe(first);

    // a stale event from the dropped client leaves its replacement alone
    first.emit('topologyClosed', new TopologyClosedEvent());
    expect(getClient()).toBe(second);
  });

  it('connects again after a first connection that failed', async () => {
    // nothing listens on this port, so the driver gives up on the first operation
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:9');
    vi.stubEnv('MONGODB_DB', 'blackjack');
    const timeout = CLIENT_OPTIONS.serverSelectionTimeoutMS;
    CLIENT_OPTIONS.serverSelectionTimeoutMS = 200;

    try {
      const first = getClient();
      await expect(getDb().command({ ping: 1 })).rejects.toThrow(MongoServerSelectionError);
      expect(getClient()).not.toBe(first);
      // a second attempt tries the server again, where the stale client would not
      await expect(getDb().command({ ping: 1 })).rejects.toThrow(MongoServerSelectionError);
    } finally {
      CLIENT_OPTIONS.serverSelectionTimeoutMS = timeout;
    }
  });

  it('throws a ConfigError without a connection string', () => {
    vi.stubEnv('MONGODB_URI', '');
    expect(() => getClient()).toThrow(ConfigError);
  });
});
