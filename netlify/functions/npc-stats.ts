import type { Config } from '@netlify/functions';
import { readNpcStats } from '../lib/aggregate';
import { json, ownerIdFrom } from '../lib/handler';
import { ConfigError, getDb } from '../lib/mongo';
import { verifyOwnerId } from '../lib/owner';
import { isOwnerId } from '../lib/validate';

/**
 * Read the computer characters' and the dealer's stats summed across every owner.
 *
 * GET /api/npc-stats  -> 200 { stats, counted, generatedAt } or 404
 *
 * The owner id travels in the Authorization header, never in the address.
 *
 * `stats` is the same for everyone. `counted` is what the asking owner had played
 * when the sums were made, so its client can add only its newer hands on top. The
 * sums are made by the aggregate-npc-stats function; until its first run this is 404.
 */
export default async (req: Request): Promise<Response> => {
  const ownerId = ownerIdFrom(req);
  if (!isOwnerId(ownerId)) return json({ error: 'Invalid owner id.' }, 400);

  try {
    if (!verifyOwnerId(ownerId)) return json({ error: 'Unknown owner id.' }, 403);
    const found = await readNpcStats(getDb(), ownerId);
    return found ? json(found) : json({ error: 'Not found.' }, 404);
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`npc-stats: ${error.message}`);
      return json({ error: 'Server is not configured.' }, 500);
    }
    console.error('npc-stats: database request failed', error);
    return json({ error: 'Database unavailable.' }, 503);
  }
};

export const config: Config = {
  path: '/api/npc-stats',
  method: 'GET',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 30 },
};
