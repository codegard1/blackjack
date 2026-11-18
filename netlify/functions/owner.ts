import type { Config } from '@netlify/functions';
import { verifyGoogleCredential } from '../lib/google';
import { ConfigError } from '../lib/mongo';
import { GOOGLE_OWNER_KIND, mintOwnerId, readOwnerSecret } from '../lib/owner';
import { parseJsonBody } from '../lib/validate';

const MAX_CREDENTIAL_BODY_BYTES = 8 * 1024;

const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * POST /api/owner -> 201 { ownerId } (empty body: anonymous browser id)
 * POST /api/owner <- { credential } -> 200 { ownerId, user } (Google ID token)
 *
 * Issue a signed owner id to an anonymous browser or a verified Google account.
 * The profiles and game functions refuse ids without a valid signature. For a
 * given Google account subject (`sub`), the signed `google:<sub>.<signature>` id
 * is deterministic, so every browser signed in to that account shares the same
 * cloud documents.
 */
export default async (req?: Request): Promise<Response> => {
  try {
    const text = req ? await req.text() : '';
    if (text.trim() === '') {
      return json({ ownerId: mintOwnerId() }, 201);
    }

    if (text.length > MAX_CREDENTIAL_BODY_BYTES) {
      return json({ error: 'Body too large.' }, 413);
    }
    const parsed = parseJsonBody(text);
    if ('error' in parsed) {
      return json({ error: parsed.error }, 400);
    }
    const { credential } = parsed.body;
    if (typeof credential !== 'string' || credential.trim() === '' || credential.length > 4096) {
      return json({ error: 'Body must be { credential: string }.' }, 400);
    }

    const secret = readOwnerSecret();
    const identity = await verifyGoogleCredential(credential);
    if (!identity) {
      return json({ error: 'Invalid Google credential.' }, 401);
    }

    const { sub, ...user } = identity;
    return json({ ownerId: mintOwnerId(GOOGLE_OWNER_KIND, secret, sub), user }, 200);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`owner: ${error.message}`);
      return json({ error: 'Server is not configured.' }, 500);
    }
    console.error('owner: unexpected error', error);
    return json({ error: 'Authentication service unavailable.' }, 503);
  }
};

export const config: Config = {
  path: '/api/owner',
  method: 'POST',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 180, windowLimit: 10 },
};
