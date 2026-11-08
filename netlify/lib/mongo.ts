import { Db, MongoClient, MongoClientOptions } from 'mongodb';

/**
 * Thrown when the function's environment variables are missing. Netlify sets
 * MONGODB_URI and MONGODB_DB from the site's environment variables; locally they
 * come from a .env file loaded by vite.config.ts.
 */
export class ConfigError extends Error {}

/**
 * Options tuned for serverless use. Each function instance holds its own pool, so
 * keep it small, and fail fast when the cluster cannot be reached instead of
 * waiting out the driver's thirty second default.
 */
export const CLIENT_OPTIONS: MongoClientOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

/** The collection that holds each owner's profiles document */
export const PROFILES_COLLECTION = 'profiles';

let client: MongoClient | undefined;

/** Read the connection settings, or throw a ConfigError naming what is missing */
export function readConfig(env: NodeJS.ProcessEnv = process.env): { uri: string; dbName: string } {
  const uri = env.MONGODB_URI;
  const dbName = env.MONGODB_DB;
  if (!uri) throw new ConfigError('MONGODB_URI is not set');
  if (!dbName) throw new ConfigError('MONGODB_DB is not set');
  return { uri, dbName };
}

/**
 * The one MongoClient for this function instance. It lives at module scope so warm
 * invocations reuse its connections, as MongoDB recommends for serverless functions.
 * The driver connects on first use and the client is never closed.
 */
export function getClient(): MongoClient {
  if (!client) {
    const { uri } = readConfig();
    client = new MongoClient(uri, CLIENT_OPTIONS);
  }
  return client;
}

/** The application database on the shared client */
export function getDb(): Db {
  return getClient().db(readConfig().dbName);
}

/** Drop the cached client so the next call builds a new one; for tests */
export function resetClient(): void {
  client = undefined;
}
