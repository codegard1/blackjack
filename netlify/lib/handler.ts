import type { Context } from '@netlify/functions';
import type { Collection } from 'mongodb';
import { ConfigError, getDb } from './mongo';
import { verifyOwnerId } from './owner';
import { isOwnerId } from './validate';

/** Parse a PUT body into the data to store, or say why it was refused */
export type BodyParser<T> = (text: string) => { data: T } | { error: string };

export type StateHandlerOptions<T> = {
  /** the function's name, for its log lines */
  name: string;
  /** the collection that holds one document per owner */
  collection: string;
  /** the document field, and the request and response body key, that carries the data */
  field: string;
  /** the largest request body a PUT accepts */
  maxBodyBytes: number;
  parse: BodyParser<T>;
};

/** Documents not written for this long are removed by the database */
export const STALE_AFTER_DAYS = 90;

/** The name of the index that expires stale documents */
export const STALE_INDEX = 'expire-stale';

/**
 * One owner's document: the owner id, the data under `field`, the write time as a
 * number for clients and as a date for the expiry index.
 */
type StateDocument = { _id: string; updatedAt: number; touchedAt: Date; createdAt: number } & Record<string, unknown>;

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

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

const indexed = new Map<string, Promise<void>>();

/**
 * Make sure the collection expires documents that have not been written for
 * STALE_AFTER_DAYS, and that documents written before the index existed (which
 * carry only the numeric updatedAt) get a touchedAt so they expire too. Once per
 * collection per function instance; both steps are no-ops once done.
 */
function ensureStaleIndex(documents: Collection<StateDocument>): Promise<void> {
  const key = `${documents.dbName}.${documents.collectionName}`;
  let pending = indexed.get(key);
  if (!pending) {
    pending = documents
      .createIndex({ touchedAt: 1 }, { name: STALE_INDEX, expireAfterSeconds: STALE_AFTER_DAYS * 24 * 60 * 60 })
      .then(() => documents.updateMany({ touchedAt: { $exists: false } }, [{ $set: { touchedAt: { $toDate: '$updatedAt' } } }]))
      .then(() => undefined)
      .catch((error: unknown) => {
        indexed.delete(key);
        console.error(`${documents.collectionName}: could not ensure the ${STALE_INDEX} index`, error);
      });
    indexed.set(key, pending);
  }
  return pending;
}

/** Forget which collections were indexed; for tests */
export function resetIndexes(): void {
  indexed.clear();
}

/**
 * A function that reads or replaces one owner's copy of some state.
 *
 * GET  -> 200 { [field]: data, updatedAt } or 404
 * PUT  <- { [field]: data }  -> 200 { updatedAt }
 *
 * Only owner ids the server issued (see owner.ts) are served. The document is
 * upserted whole; the server stamps updatedAt so clients can tell which copy is
 * newer. Rejected requests are noted in the function log without echoing the body.
 */
export function createStateHandler<T>({ name, collection, field, maxBodyBytes, parse }: StateHandlerOptions<T>) {
  const reject = (status: number, error: string, req: Request): Response => {
    console.warn(`${name}: ${req.method} rejected with ${status}: ${error}`);
    return json({ error }, status);
  };

  return async (req: Request, context: Context): Promise<Response> => {
    const ownerId = ownerIdFrom(context);
    if (!isOwnerId(ownerId)) return reject(400, 'Invalid owner id.', req);

    try {
      if (!verifyOwnerId(ownerId)) return reject(403, 'Unknown owner id.', req);

      const documents = getDb().collection<StateDocument>(collection);

      if (req.method === 'GET') {
        const document = await documents.findOne({ _id: ownerId });
        return document
          ? json({ [field]: document[field], updatedAt: document.updatedAt })
          : json({ error: 'Not found.' }, 404);
      }

      if (Number(req.headers.get('content-length') ?? 0) > maxBodyBytes) return reject(413, 'Body too large.', req);
      const text = await req.text();
      if (text.length > maxBodyBytes) return reject(413, 'Body too large.', req);
      const parsed = parse(text);
      if ('error' in parsed) return reject(400, parsed.error, req);

      await ensureStaleIndex(documents);
      const updatedAt = Date.now();
      await documents.updateOne(
        { _id: ownerId },
        { $set: { [field]: parsed.data, updatedAt, touchedAt: new Date(updatedAt) }, $setOnInsert: { createdAt: updatedAt } },
        { upsert: true },
      );
      return json({ updatedAt });
    } catch (error) {
      if (error instanceof ConfigError) {
        console.error(`${name}: ${error.message}`);
        return json({ error: 'Server is not configured.' }, 500);
      }
      console.error(`${name}: database request failed`, error);
      return json({ error: 'Database unavailable.' }, 503);
    }
  };
}
