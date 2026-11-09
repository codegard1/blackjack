// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createGameState } from '../../src/context';
import { GameAction } from '../../src/enums';
import { gameReducer } from '../../src/functions/gameReducer';
import { gameSnapshot } from '../../src/functions/persistence';
import { GAME_MAX_BODY_BYTES, isGameSnapshot, parseGameBody } from './validateGame';

const dealt = () => gameReducer(gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] }), { type: GameAction.Deal });
const body = (game: unknown) => JSON.stringify({ game });

describe('isGameSnapshot', () => {
  it('accepts the snapshot the game itself produces, before and after a deal', () => {
    expect(isGameSnapshot(JSON.parse(JSON.stringify(gameSnapshot(createGameState()))))).toBe(true);
    expect(isGameSnapshot(JSON.parse(JSON.stringify(gameSnapshot(dealt()))))).toBe(true);
  });

  it('rejects snapshots with a part missing or of the wrong shape', () => {
    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(dealt())));
    expect(isGameSnapshot({ ...snapshot, deck: undefined })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, deck: { ...snapshot.deck, cardKeys: 'all' } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, deck: { ...snapshot.deck, playerHands: { chris: { cards: ['Spade_1'] } } } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, players: { ...snapshot.players, players: { chris: { key: 'dealer', title: 'x', bank: 1 } } } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, pot: 'lots' } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, activityLog: [{ id: 'one' }] } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, winner: 7 } })).toBe(false);
  });
});

describe('parseGameBody', () => {
  it('returns the snapshot with unknown keys removed and the rest intact', () => {
    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(dealt())));
    const padded = { ...snapshot, extra: 1, game: { ...snapshot.game, extra: 2 }, deck: { ...snapshot.deck, extra: 3 } };
    const parsed = parseGameBody(body(padded));
    expect(parsed).toEqual({ data: snapshot });
  });

  it('rejects bodies that are too large, not JSON, or the wrong shape', () => {
    expect(parseGameBody('x'.repeat(GAME_MAX_BODY_BYTES + 1))).toEqual({ error: 'Body too large.' });
    expect(parseGameBody('{nope')).toEqual({ error: 'Body is not valid JSON.' });
    expect(parseGameBody('{}')).toEqual({ error: 'Body must be { game: GameSnapshot }.' });
    expect(parseGameBody(body({ deck: {}, players: {}, game: {} }))).toHaveProperty('error');
  });
});
