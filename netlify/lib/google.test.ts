// @vitest-environment node
import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOOGLE_JWKS_URL, readGoogleClientId, resetGoogleKeys, verifyGoogleCredential } from './google';
import { ConfigError } from './mongo';

const CLIENT_ID = '1234567890-abcdef.apps.googleusercontent.com';
const KID = 'test-google-key-1';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };

function makeToken(
  payloadOverrides: Record<string, unknown> = {},
  headerOverrides: Record<string, unknown> = {},
  signingKey = privateKey,
): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: KID, ...headerOverrides };
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '107691503500061507151',
    name: 'Chris Odegard',
    email: 'chris@example.com',
    picture: 'https://lh3.googleusercontent.com/a/avatar',
    iat: nowSec - 60,
    exp: nowSec + 3600,
    ...payloadOverrides,
  };
  const headerPart = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signaturePart = sign('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), signingKey).toString('base64url');
  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

beforeEach(() => {
  resetGoogleKeys();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    }),
  ));
});

afterEach(() => {
  resetGoogleKeys();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readGoogleClientId', () => {
  it('reads VITE_GOOGLE_CLIENT_ID and throws ConfigError when absent', () => {
    expect(() => readGoogleClientId({})).toThrow(new ConfigError('VITE_GOOGLE_CLIENT_ID is not set'));
    expect(readGoogleClientId({ VITE_GOOGLE_CLIENT_ID: ` ${CLIENT_ID} ` })).toBe(CLIENT_ID);
  });
});

describe('verifyGoogleCredential', () => {
  it('verifies a valid Google ID token and caches the JWK set across calls', async () => {
    const token = makeToken();
    const identity = await verifyGoogleCredential(token, CLIENT_ID);
    expect(identity).toEqual({
      sub: '107691503500061507151',
      name: 'Chris Odegard',
      email: 'chris@example.com',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    });

    await verifyGoogleCredential(token, CLIENT_ID);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(GOOGLE_JWKS_URL);
  });

  it('falls back to given_name or email prefix when name is absent', async () => {
    const withGiven = makeToken({ name: undefined, given_name: 'Chris', picture: 'http://not-https' });
    expect(await verifyGoogleCredential(withGiven, CLIENT_ID)).toEqual({
      sub: '107691503500061507151',
      name: 'Chris',
      email: 'chris@example.com',
    });

    const withEmailOnly = makeToken({ name: undefined, email: 'player@example.com', picture: undefined });
    expect(await verifyGoogleCredential(withEmailOnly, CLIENT_ID)).toEqual({
      sub: '107691503500061507151',
      name: 'player',
      email: 'player@example.com',
    });
  });

  it('rejects malformed, expired, wrong-audience, wrong-issuer, or tampered tokens', async () => {
    expect(await verifyGoogleCredential('not-a-jwt', CLIENT_ID)).toBeUndefined();
    expect(await verifyGoogleCredential(makeToken({}, { alg: 'HS256' }), CLIENT_ID)).toBeUndefined();
    expect(await verifyGoogleCredential(makeToken({ iss: 'https://evil.example.com' }), CLIENT_ID)).toBeUndefined();
    expect(await verifyGoogleCredential(makeToken({ aud: 'other-client' }), CLIENT_ID)).toBeUndefined();
    expect(await verifyGoogleCredential(makeToken({ exp: Math.floor(Date.now() / 1000) - 300 }), CLIENT_ID)).toBeUndefined();
    expect(await verifyGoogleCredential(makeToken({ sub: 'short' }), CLIENT_ID)).toBeUndefined();

    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    expect(await verifyGoogleCredential(makeToken({}, {}, otherKey), CLIENT_ID)).toBeUndefined();
  });
});
