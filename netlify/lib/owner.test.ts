// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from './mongo';
import { mintOwnerId, readOwnerSecret, verifyOwnerId } from './owner';

const SECRET = 'correct-horse-battery-staple-2026';

afterEach(() => vi.unstubAllEnvs());

describe('owner ids', () => {
  it('mints ids of the documented shape and verifies them', () => {
    const id = mintOwnerId('browser', SECRET);
    expect(id).toMatch(/^browser:[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
    expect(verifyOwnerId(id, SECRET)).toBe(true);
    expect(mintOwnerId('browser', SECRET)).not.toBe(id);
  });

  it('refuses ids that were tampered with, made up, or signed with another secret', () => {
    const id = mintOwnerId('browser', SECRET);
    const [payload, signature] = id.split('.');
    expect(verifyOwnerId(`${payload}x.${signature}`, SECRET)).toBe(false);
    expect(verifyOwnerId(`${payload}.${signature.slice(0, -1)}A`, SECRET)).toBe(false);
    expect(verifyOwnerId(`${payload}.${signature}`, 'another-secret-entirely-here')).toBe(false);
    expect(verifyOwnerId('browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c', SECRET)).toBe(false);
    expect(verifyOwnerId('browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c.', SECRET)).toBe(false);
  });

  it('reads the secret from the environment and insists on a real one', () => {
    expect(() => readOwnerSecret({})).toThrow(new ConfigError('OWNER_ID_SECRET is not set'));
    expect(() => readOwnerSecret({ OWNER_ID_SECRET: 'short' })).toThrow(ConfigError);
    vi.stubEnv('OWNER_ID_SECRET', SECRET);
    expect(verifyOwnerId(mintOwnerId())).toBe(true);
  });
});
