import type { Config } from '@netlify/functions';
import { createStateHandler } from '../lib/handler';
import { PROFILES_COLLECTION } from '../lib/mongo';
import { MAX_BODY_BYTES, parseProfilesBody } from '../lib/validate';

/**
 * Read or replace the profiles for one owner.
 *
 * GET /api/profiles/:ownerId  -> 200 { profiles, updatedAt } or 404
 * PUT /api/profiles/:ownerId  <- { profiles }  -> 200 { updatedAt }
 */
export default createStateHandler({
  name: 'profiles',
  collection: PROFILES_COLLECTION,
  field: 'profiles',
  maxBodyBytes: MAX_BODY_BYTES,
  parse: parseProfilesBody,
});

export const config: Config = {
  path: '/api/profiles/:ownerId',
  method: ['GET', 'PUT'],
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 60 },
};
