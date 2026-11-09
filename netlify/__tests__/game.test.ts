// @vitest-environment node
import type { Context } from '@netlify/functions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../../src/context';
import { GameAction } from '../../src/enums';
import { gameReducer } from '../../src/functions/gameReducer';
import { gameSnapshot } from '../../src/functions/persistence';
import handler, { config } from '../functions/game';

const findOne = vi.fn();
const updateOne = vi.fn();
const collection = vi.fn(() => ({ findOne, updateOne }));

vi.mock('../lib/mongo', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/mongo')>(),
  getDb: () => ({ collection }),
}));

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c';
const snapshot = () => JSON.parse(JSON.stringify(gameSnapshot(gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] }))));

const call = (method: string, body?: unknown) => handler(
  new Request(`http://localhost/api/game/${encodeURIComponent(OWNER)}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  { params: { ownerId: encodeURIComponent(OWNER) } } as unknown as Context,
);

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('game function', () => {
  it('is routed by owner id for GET and PUT, with a looser rate limit than profiles', () => {
    expect(config.path).toBe('/api/game/:ownerId');
    expect(config.method).toEqual(['GET', 'PUT']);
    expect(config.rateLimit).toMatchObject({ aggregateBy: ['ip'], windowLimit: 120 });
  });

  it('reads from the games collection and returns the stored snapshot', async () => {
    const game = snapshot();
    findOne.mockResolvedValueOnce({ _id: OWNER, game, updatedAt: 5, createdAt: 1 });
    const response = await call('GET');
    expect(collection).toHaveBeenCalledWith('games');
    expect(await response.json()).toEqual({ game, updatedAt: 5 });
  });

  it('upserts a valid snapshot under the game field', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000123);
    updateOne.mockResolvedValueOnce({ acknowledged: true });
    const game = snapshot();

    const response = await call('PUT', { game });
    expect(response.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: OWNER },
      { $set: { game, updatedAt: 1700000000123 }, $setOnInsert: { createdAt: 1700000000123 } },
      { upsert: true },
    );
  });

  it('rejects a snapshot of the wrong shape and logs why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await call('PUT', { game: { deck: {}, players: {}, game: {} } });
    expect(response.status).toBe(400);
    expect(updateOne).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('game: PUT rejected with 400: Body must be { game: GameSnapshot }.');
  });
});
