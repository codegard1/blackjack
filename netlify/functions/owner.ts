import type { Config } from '@netlify/functions';
import { ConfigError } from '../lib/mongo';
import { mintOwnerId } from '../lib/owner';

/**
 * POST /api/owner -> 201 { ownerId }
 *
 * Issue a signed owner id to an anonymous browser. A browser asks once and keeps the
 * id; the profiles and game functions refuse ids without a valid signature. The rate
 * limit is tight because a real client needs one id for its lifetime.
 */
export default async (): Promise<Response> => {
  try {
    return Response.json({ ownerId: mintOwnerId() }, { status: 201 });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`owner: ${error.message}`);
      return Response.json({ error: 'Server is not configured.' }, { status: 500 });
    }
    throw error;
  }
};

export const config: Config = {
  path: '/api/owner',
  method: 'POST',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 10 },
};
