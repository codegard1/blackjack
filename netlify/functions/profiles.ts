import type { Config, Context } from '@netlify/functions';
import { ConfigError, getDb, PROFILES_COLLECTION } from '../lib/mongo';
import { isOwnerId, MAX_BODY_BYTES, parseProfilesBody, ProfileDocument } from '../lib/validate';

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

/** A rejected request, noted in the function log without echoing the body */
const reject = (status: number, error: string, req: Request): Response => {
  console.warn(`profiles: ${req.method} rejected with ${status}: ${error}`);
  return json({ error }, status);
};

/**
 * The owner id from the route. The client percent-encodes it and the platform hands
 * the parameter over still encoded, so decode it before checking its shape.
 */
function ownerIdFrom(context: Context): string | undefined {
  try {
    return decodeURIComponent(context.params.ownerId ?? '');
  } catch {
    return undefined;
  }
}

/**
 * Read or replace the profiles for one owner.
 *
 * GET /api/profiles/:ownerId  -> 200 { profiles, updatedAt } or 404
 * PUT /api/profiles/:ownerId  <- { profiles }  -> 200 { updatedAt }
 *
 * The document is upserted whole; the server stamps updatedAt so clients can tell
 * which copy is newer.
 */
export default async (req: Request, context: Context): Promise<Response> => {
  const ownerId = ownerIdFrom(context);
  if (!isOwnerId(ownerId)) return reject(400, 'Invalid owner id.', req);

  try {
    const collection = getDb().collection<ProfileDocument>(PROFILES_COLLECTION);

    if (req.method === 'GET') {
      const document = await collection.findOne({ _id: ownerId });
      return document
        ? json({ profiles: document.profiles, updatedAt: document.updatedAt })
        : json({ error: 'Not found.' }, 404);
    }

    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reject(413, 'Body too large.', req);
    const parsed = parseProfilesBody(await req.text());
    if ('error' in parsed) return reject(parsed.error === 'Body too large.' ? 413 : 400, parsed.error, req);

    const updatedAt = Date.now();
    await collection.updateOne(
      { _id: ownerId },
      { $set: { profiles: parsed.profiles, updatedAt }, $setOnInsert: { createdAt: updatedAt } },
      { upsert: true },
    );
    return json({ updatedAt });
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('profiles: ' + error.message);
      return json({ error: 'Server is not configured.' }, 500);
    }
    console.error('profiles: database request failed', error);
    return json({ error: 'Database unavailable.' }, 503);
  }
};

export const config: Config = {
  path: '/api/profiles/:ownerId',
  method: ['GET', 'PUT'],
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip'], windowSize: 60, windowLimit: 60 },
};
