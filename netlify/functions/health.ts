import type { Config } from '@netlify/functions';
import { ConfigError, getDb } from '../lib/mongo';

/**
 * GET /api/health -> 200 { ok: true } when the database answers a ping,
 * 500 when the function is missing its configuration, 503 otherwise.
 * It reports reachability only and never returns data.
 */
export default async (): Promise<Response> => {
  try {
    await getDb().command({ ping: 1 });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('health: ' + error.message);
      return Response.json({ ok: false, error: 'Server is not configured.' }, { status: 500 });
    }
    console.error('health: ping failed', error);
    return Response.json({ ok: false, error: 'Database unavailable.' }, { status: 503 });
  }
};

export const config: Config = {
  path: '/api/health',
  method: 'GET',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 10 },
};
