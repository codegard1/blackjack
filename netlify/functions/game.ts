import type { Config } from '@netlify/functions';
import { createStateHandler } from '../lib/handler';
import { GAMES_COLLECTION } from '../lib/mongo';
import { GAME_MAX_BODY_BYTES, parseGameBody } from '../lib/validateGame';

/**
 * Read or replace the game in progress for one owner.
 *
 * GET /api/game  -> 200 { game, updatedAt } or 404
 * PUT /api/game  <- { game }  -> 200 { updatedAt }
 *
 * The game changes with every action, so the limit allows a few writes a second.
 *
 * The owner id travels in the Authorization header. The route with the id in it is
 * kept for installed clients from before that, and can go once they have updated.
 */
export default createStateHandler({
  name: 'game',
  collection: GAMES_COLLECTION,
  field: 'game',
  maxBodyBytes: GAME_MAX_BODY_BYTES,
  parse: parseGameBody,
});

export const config: Config = {
  path: ['/api/game', '/api/game/:ownerId'],
  method: ['GET', 'PUT'],
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 120 },
};
