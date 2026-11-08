// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isOwnerId, MAX_BODY_BYTES, parseProfilesBody } from './validate';

const stats = { numberOfGamesPlayed: 3, numberOfGamesWon: 1, netResult: -20 };
const profiles = {
  profiles: [{ id: 'chris', name: 'Chris', createdAt: 0, stats }],
  selectedId: 'chris',
  opponentIds: ['ogion'],
};

describe('isOwnerId', () => {
  it('accepts a kind, a colon and an identifier', () => {
    expect(isOwnerId('browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c')).toBe(true);
    expect(isOwnerId('github:12345678')).toBe(true);
  });

  it('rejects other shapes', () => {
    expect(isOwnerId('')).toBe(false);
    expect(isOwnerId('browser:short')).toBe(false);
    expect(isOwnerId('no-colon-here-at-all')).toBe(false);
    expect(isOwnerId('browser:has space in it')).toBe(false);
    expect(isOwnerId('browser:$where-injection')).toBe(false);
    expect(isOwnerId(42)).toBe(false);
  });
});

describe('parseProfilesBody', () => {
  it('returns the profiles with unknown keys removed', () => {
    const body = JSON.stringify({ profiles: { ...profiles, extra: true, profiles: [{ ...profiles.profiles[0], secret: 'x' }] } });
    expect(parseProfilesBody(body)).toEqual({ profiles });
  });

  it('rejects bodies that are too large, not JSON, or the wrong shape', () => {
    expect(parseProfilesBody('x'.repeat(MAX_BODY_BYTES + 1))).toEqual({ error: 'Body too large.' });
    expect(parseProfilesBody('{not json')).toEqual({ error: 'Body is not valid JSON.' });
    expect(parseProfilesBody('[]')).toEqual({ error: 'Body must be { profiles: ProfileState }.' });
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, selectedId: 7 } }))).toHaveProperty('error');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ id: 'a', name: '', createdAt: 0, stats }] } }))).toHaveProperty('error');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ ...profiles.profiles[0], stats: { wins: 'many' } }] } }))).toHaveProperty('error');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, opponentIds: 'ogion' } }))).toHaveProperty('error');
  });
});
