import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConfigError } from './mongo';

/** The kind of owner id handed to an anonymous browser */
export const BROWSER_OWNER_KIND = 'browser';

const MIN_SECRET_LENGTH = 16;

/** The secret that signs owner ids, from OWNER_ID_SECRET; never sent anywhere */
export function readOwnerSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.OWNER_ID_SECRET;
  if (!secret) throw new ConfigError('OWNER_ID_SECRET is not set');
  if (secret.length < MIN_SECRET_LENGTH) throw new ConfigError(`OWNER_ID_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  return secret;
}

const sign = (payload: string, secret: string): string => createHmac('sha256', secret).update(payload).digest('base64url');

/**
 * Issue an owner id: a kind, a random identifier, and a signature over both, as
 * `kind:identifier.signature`. Only ids the server issued verify, so a client cannot
 * invent ids and fill the database under them.
 */
export function mintOwnerId(kind = BROWSER_OWNER_KIND, secret = readOwnerSecret()): string {
  const payload = `${kind}:${randomUUID()}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Whether an owner id carries a signature this server made */
export function verifyOwnerId(ownerId: string, secret = readOwnerSecret()): boolean {
  const dot = ownerId.lastIndexOf('.');
  if (dot < 0) return false;
  const given = Buffer.from(ownerId.slice(dot + 1));
  const expected = Buffer.from(sign(ownerId.slice(0, dot), secret));
  return given.length === expected.length && timingSafeEqual(given, expected);
}
