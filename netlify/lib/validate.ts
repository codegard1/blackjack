import type { PlayerProfile, PlayerStats, ProfileState } from '../../src/types';

/** The document stored for each owner: the profiles plus when they were last written */
export type ProfileDocument = {
  /** the owner id: a kind prefix and an identifier, such as browser:<uuid> */
  _id: string;
  profiles: ProfileState;
  /** milliseconds since the epoch, set by the server on every write */
  updatedAt: number;
  createdAt: number;
};

/** The largest request body a profiles PUT accepts; twenty-five profiles are about 7 KB */
export const MAX_BODY_BYTES = 16 * 1024;
/** Matches MAX_PROFILES in src/functions/profiles.ts, where creation stops */
const MAX_PROFILES = 50;
const MAX_OPPONENTS = 10;
const MAX_STAT_KEYS = 20;

/**
 * Owner ids are a kind, a colon, an identifier, a dot and a signature (see owner.ts).
 * Today the kind is `browser`; a signed-in identity such as `github:<id>` fits the
 * same shape. This is the cheap shape check; the signature is verified separately.
 */
const OWNER_ID = /^[a-z]{2,16}:[A-Za-z0-9._-]{8,128}$/;

export function isOwnerId(value: unknown): value is string {
  return typeof value === 'string' && OWNER_ID.test(value);
}

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isStringArray = (value: unknown, max: number): value is string[] =>
  Array.isArray(value) && value.length <= max && value.every((item) => typeof item === 'string');

/** Parse a request body that must be a JSON object, or say why it is not */
export function parseJsonBody(text: string): { body: Record<string, unknown> } | { error: string } {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: 'Body is not valid JSON.' };
  }
  return isObject(body) ? { body } : { error: 'Body must be a JSON object.' };
}

export function isStats(value: unknown): value is PlayerStats {
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= MAX_STAT_KEYS
    && entries.every(([key, stat]) => /^[A-Za-z]{1,40}$/.test(key) && isFiniteNumber(stat));
}

function isProfile(value: unknown): value is PlayerProfile {
  return isObject(value)
    && isText(value.id, 64)
    && isText(value.name, 40)
    && isFiniteNumber(value.createdAt)
    && isStats(value.stats);
}

export function isProfileState(value: unknown): value is ProfileState {
  return isObject(value)
    && Array.isArray(value.profiles)
    && value.profiles.length <= MAX_PROFILES
    && value.profiles.every(isProfile)
    && typeof value.selectedId === 'string'
    && isStringArray(value.opponentIds, MAX_OPPONENTS);
}

/** Keep only the fields the document stores, so unknown keys never reach the database */
function pickProfileState(state: ProfileState): ProfileState {
  return {
    profiles: state.profiles.map(({ id, name, createdAt, stats }) => ({ id, name, createdAt, stats: { ...stats } })),
    selectedId: state.selectedId,
    opponentIds: [...state.opponentIds],
  };
}

/**
 * Parse the body of a profiles PUT: JSON of the form `{ profiles: ProfileState }`.
 * Returns the cleaned profiles, or the reason the body was rejected.
 */
export function parseProfilesBody(text: string): { data: ProfileState } | { error: string } {
  if (text.length > MAX_BODY_BYTES) return { error: 'Body too large.' };
  const parsed = parseJsonBody(text);
  if ('error' in parsed) return parsed;
  if (!isProfileState(parsed.body.profiles)) return { error: 'Body must be { profiles: ProfileState }.' };
  return { data: pickProfileState(parsed.body.profiles) };
}
