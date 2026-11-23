import type { Config } from '@netlify/functions';
import { createStateHandler } from '../lib/handler';
import { SETTINGS_COLLECTION } from '../lib/mongo';
import { parseSettingsBody, SETTINGS_MAX_BODY_BYTES } from '../lib/validateSettings';

/**
 * Read or replace the app settings for one owner.
 *
 * GET /api/settings  -> 200 { settings, updatedAt } or 404
 * PUT /api/settings  <- { settings }  -> 200 { updatedAt }
 *
 * The owner id travels in the Authorization header, never in the address.
 */
export default createStateHandler({
  name: 'settings',
  collection: SETTINGS_COLLECTION,
  field: 'settings',
  maxBodyBytes: SETTINGS_MAX_BODY_BYTES,
  parse: parseSettingsBody,
});

export const config: Config = {
  path: '/api/settings',
  method: ['GET', 'PUT'],
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 60 },
};
