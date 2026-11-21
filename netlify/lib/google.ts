import { createPublicKey, verify } from 'node:crypto';
import { ConfigError } from './mongo';
import { isObject } from './validate';

/** Where Google publishes the public keys that sign its ID tokens */
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const SUB_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;
const DEFAULT_CACHE_MS = 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

export type GoogleIdentity = {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
};

type CachedKeys = {
  keys: Map<string, JsonWebKey>;
  expiresAt: number;
};

let cached: CachedKeys | undefined;

/** Read the OAuth 2.0 Client ID from the environment, or throw a ConfigError */
export function readGoogleClientId(env: NodeJS.ProcessEnv = process.env): string {
  const clientId = (env.VITE_GOOGLE_CLIENT_ID ?? env.GOOGLE_CLIENT_ID ?? '').trim();
  if (!clientId) throw new ConfigError('VITE_GOOGLE_CLIENT_ID is not set');
  return clientId;
}

/** Drop the cached Google public keys; for tests */
export function resetGoogleKeys(): void {
  cached = undefined;
}

function parseMaxAgeMs(cacheControl: string | null): number {
  const match = /max-age=(\d+)/i.exec(cacheControl ?? '');
  const seconds = match ? Number(match[1]) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_CACHE_MS;
}

async function fetchGoogleKeys(): Promise<Map<string, JsonWebKey>> {
  const response = await fetch(GOOGLE_JWKS_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Google certs responded with ${response.status}`);
  const body: unknown = await response.json();
  const keys = new Map<string, JsonWebKey>();
  if (isObject(body) && Array.isArray(body.keys)) {
    for (const entry of body.keys) {
      if (isObject(entry) && typeof entry.kid === 'string' && entry.kty === 'RSA') {
        keys.set(entry.kid, entry);
      }
    }
  }
  cached = { keys, expiresAt: Date.now() + parseMaxAgeMs(response.headers.get('cache-control')) };
  return keys;
}

async function getGoogleKey(kid: string): Promise<JsonWebKey | undefined> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    const found = cached.keys.get(kid);
    if (found) return found;
  }
  const keys = await fetchGoogleKeys();
  return keys.get(kid);
}

function decodeJsonSegment(segment: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verify a Google ID token (`credential` from Google Identity Services) and return
 * the account's subject and display profile, or undefined when the token is malformed,
 * expired, for another audience, or not signed by Google.
 */
export async function verifyGoogleCredential(
  credential: string,
  clientId = readGoogleClientId(),
): Promise<GoogleIdentity | undefined> {
  const parts = credential.split('.');
  if (parts.length !== 3) return undefined;
  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) return undefined;

  const header = decodeJsonSegment(headerPart);
  const payload = decodeJsonSegment(payloadPart);
  if (!header || !payload) return undefined;
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) return undefined;

  const now = Date.now();
  if (typeof payload.iss !== 'string' || !ISSUERS.has(payload.iss)) return undefined;
  if (payload.aud !== clientId) return undefined;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now - CLOCK_SKEW_MS) return undefined;
  if (typeof payload.nbf === 'number' && payload.nbf * 1000 > now + CLOCK_SKEW_MS) return undefined;
  if (typeof payload.sub !== 'string' || !SUB_PATTERN.test(payload.sub)) return undefined;

  const jwk = await getGoogleKey(header.kid);
  if (!jwk) return undefined;

  try {
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
    const signedData = Buffer.from(`${headerPart}.${payloadPart}`, 'utf8');
    const signature = Buffer.from(signaturePart, 'base64url');
    if (!verify('RSA-SHA256', signedData, publicKey, signature)) return undefined;
  } catch {
    return undefined;
  }

  const email = typeof payload.email === 'string' && payload.email.length <= 120 ? payload.email : undefined;
  const rawName = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name.trim()
    : typeof payload.given_name === 'string' && payload.given_name.trim()
      ? payload.given_name.trim()
      : email?.split('@')[0] ?? 'Google Player';
  const name = rawName.slice(0, 60);
  const picture = typeof payload.picture === 'string' && /^https:\/\/\S+$/.test(payload.picture) && payload.picture.length <= 512
    ? payload.picture
    : undefined;

  return {
    sub: payload.sub,
    name,
    ...(email ? { email } : {}),
    ...(picture ? { picture } : {}),
  };
}
