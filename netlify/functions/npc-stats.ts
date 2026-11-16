import type { Config, Context } from '@netlify/functions';
import { readNpcStats } from '../lib/aggregate';
import { ownerIdFrom } from '../lib/handler';
import { ConfigError, getDb } from '../lib/mongo';
import { verifyOwnerId } from '../lib/owner';
import { isOwnerId } from '../lib/validate';

/**
 * Read the computer characters' and the dealer's stats summed across every owner.
 *
 * GET /api/npc-stats/:ownerId  -> 200 { stats, counted, generatedAt } or 404
 *
 * `stats` is the same for everyone. `counted` is what the asking owner had played
 * when the sums were made, so its client can add only its newer hands on top. The
 * sums are made by the aggregate-npc-stats function; until its first run this is 404.
 */
export default async (req: Request, context: Context): Promise<Response> => {
  const ownerId = ownerIdFrom(context);
  if (!isOwnerId(ownerId)) return Response.json({ error: 'Invalid owner id.' }, { status: 400 });

  try {
    if (!verifyOwnerId(ownerId)) return Response.json({ error: 'Unknown owner id.' }, { status: 403 });
    const found = await readNpcStats(getDb(), ownerId);
    return found ? Response.json(found) : Response.json({ error: 'Not found.' }, { status: 404 });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`npc-stats: ${error.message}`);
      return Response.json({ error: 'Server is not configured.' }, { status: 500 });
    }
    console.error('npc-stats: database request failed', error);
    return Response.json({ error: 'Database unavailable.' }, { status: 503 });
  }
};

export const config: Config = {
  path: '/api/npc-stats/:ownerId',
  method: 'GET',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 30 },
};
