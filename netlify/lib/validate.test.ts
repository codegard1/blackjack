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
    expect(parseProfilesBody(body)).toEqual({ data: profiles });
  });

  it('rejects bodies that are too large, not JSON, or the wrong shape', () => {
    expect(parseProfilesBody('x'.repeat(MAX_BODY_BYTES + 1))).toEqual({ error: 'Body too large.' });
    // the limit is in bytes: these characters are two bytes each, so fewer of them are too many
    expect(parseProfilesBody('é'.repeat(MAX_BODY_BYTES / 2 + 1))).toEqual({ error: 'Body too large.' });
    expect(parseProfilesBody('{not json')).toEqual({ error: 'Body is not valid JSON.' });
    expect(parseProfilesBody('[]')).toEqual({ error: 'Body must be a JSON object.' });
    expect(parseProfilesBody('{}')).toEqual({ error: 'Body must be { profiles: ProfileState }.' });
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, selectedId: 7 } }))).toHaveProperty('error');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ id: 'a', name: '', createdAt: 0, stats }] } }))).toHaveProperty('error');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ ...profiles.profiles[0], stats: { wins: 'many' } }] } }))).toHaveProperty('error');
    // counts are whole numbers that are not negative; only netResult may fall below zero
    for (const bad of [{ numberOfGamesPlayed: -1 }, { numberOfGamesWon: 1.5 }, { netResult: 0.5 }, { winLossRatio: -1 }, { totalWinnings: 2 ** 60 }]) {
      expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ ...profiles.profiles[0], stats: bad }] } }))).toHaveProperty('error');
    }
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, profiles: [{ ...profiles.profiles[0], stats: { netResult: -20, winLossRatio: 0.75 } }] } }))).toHaveProperty('data');
    expect(parseProfilesBody(JSON.stringify({ profiles: { ...profiles, opponentIds: 'ogion' } }))).toHaveProperty('error');
  });

  it('preserves valid bot profile work and bank fields and strips unknown nested keys inside work', () => {
    const botProfile = {
      id: 'ogion',
      name: 'Ogion',
      createdAt: 0,
      stats,
      bank: 250,
      balanceHistory: [1000, 500, 250],
      work: { status: 'working', taskId: 'herding-goats', daysWorked: 2, extraWorkKey: 'strip-me' },
      taskOverride: 'minding-ansible',
      allowReturn: true,
    };
    const result = parseProfilesBody(JSON.stringify({
      profiles: {
        ...profiles,
        profiles: [profiles.profiles[0], botProfile],
      },
    }));

    expect(result).toEqual({
      data: {
        ...profiles,
        profiles: [
          profiles.profiles[0],
          {
            id: 'ogion',
            name: 'Ogion',
            createdAt: 0,
            stats,
            bank: 250,
            balanceHistory: [1000, 500, 250],
            work: { status: 'working', taskId: 'herding-goats', daysWorked: 2 },
            taskOverride: 'minding-ansible',
            allowReturn: true,
          },
        ],
      },
    });
  });

  it('rejects invalid bot profile bank, balanceHistory, work, taskOverride, and allowReturn fields', () => {
    const withBotField = (overrides: Record<string, unknown>) => JSON.stringify({
      profiles: {
        ...profiles,
        profiles: [{ ...profiles.profiles[0], id: 'ogion', name: 'Ogion', ...overrides }],
      },
    });

    for (const badBank of [-1, '1000', null]) {
      expect(parseProfilesBody(withBotField({ bank: badBank }))).toHaveProperty('error');
    }

    for (const badHistory of [[-1], ['100'], Array.from({ length: 201 }, () => 100)]) {
      expect(parseProfilesBody(withBotField({ balanceHistory: badHistory }))).toHaveProperty('error');
    }

    for (const badWork of [
      { status: 'sleeping', taskId: 'smashing-rocks', daysWorked: 0 },
      { status: 'working', taskId: 'bogus-task', daysWorked: 0 },
      { status: 'working', taskId: 'smashing-rocks', daysWorked: -1 },
      { status: 'working', taskId: 'smashing-rocks', daysWorked: 31 },
      { status: 'working', taskId: 'smashing-rocks', daysWorked: 1.5 },
    ]) {
      expect(parseProfilesBody(withBotField({ work: badWork }))).toHaveProperty('error');
    }

    expect(parseProfilesBody(withBotField({ taskOverride: 'not-a-task' }))).toHaveProperty('error');
    expect(parseProfilesBody(withBotField({ allowReturn: 'yes' }))).toHaveProperty('error');
  });
});
