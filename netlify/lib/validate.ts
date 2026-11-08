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

/** The largest request body a PUT accepts; a profile set is a few kilobytes */
export const MAX_BODY_BYTES = 64 * 1024;
const MAX_PROFILES = 100;
const MAX_OPPONENTS = 10;
const MAX_STAT_KEYS = 20;

/**
 * Owner ids are a kind, a colon, and an identifier. Today the kind is `browser`;
 * a signed-in identity such as `github:<id>` fits the same shape.
 */
const OWNER_ID = /^[a-z]{2,16}:[A-Za-z0-9._-]{8,128}$/;

export function isOwnerId(value: unknown): value is string {
  return typeof value === 'string' && OWNER_ID.test(value);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

function isStats(value: unknown): value is PlayerStats {
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= MAX_STAT_KEYS
    && entries.every(([key, stat]) => /^[A-Za-z]{1,40}$/.test(key) && typeof stat === 'number' && Number.isFinite(stat));
}

function isProfile(value: unknown): value is PlayerProfile {
  return isObject(value)
    && isText(value.id, 64)
    && isText(value.name, 40)
    && typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
    && isStats(value.stats);
}

export function isProfileState(value: unknown): value is ProfileState {
  return isObject(value)
    && Array.isArray(value.profiles)
    && value.profiles.length <= MAX_PROFILES
    && value.profiles.every(isProfile)
    && typeof value.selectedId === 'string'
    && Array.isArray(value.opponentIds)
    && value.opponentIds.length <= MAX_OPPONENTS
    && value.opponentIds.every((id) => typeof id === 'string');
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
 * Parse the body of a PUT: JSON of the form `{ profiles: ProfileState }`.
 * Returns the cleaned profiles, or the reason the body was rejected.
 */
export function parseProfilesBody(text: string): { profiles: ProfileState } | { error: string } {
  if (text.length > MAX_BODY_BYTES) return { error: 'Body too large.' };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { error: 'Body is not valid JSON.' };
  }
  if (!isObject(body) || !isProfileState(body.profiles)) return { error: 'Body must be { profiles: ProfileState }.' };
  return { profiles: pickProfileState(body.profiles) };
}
