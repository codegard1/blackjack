// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BOTS } from '../../src/characters';
import { createGameState } from '../../src/context';
import { GameAction } from '../../src/enums';
import { gameReducer } from '../../src/functions/gameReducer';
import { gameSnapshot } from '../../src/functions/persistence';
import { defaultProfileState, seatsFor } from '../../src/functions/profiles';
import { BOT_IDS, GAME_MAX_BODY_BYTES, isGameSnapshot, parseGameBody } from './validateGame';

const dealt = () => gameReducer(gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] }), { type: GameAction.Deal });
const body = (game: unknown) => JSON.stringify({ game });

describe('isGameSnapshot', () => {
  it('accepts the snapshot the game itself produces, before and after a deal', () => {
    expect([...BOT_IDS]).toEqual(BOTS.map((bot) => bot.id));
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
  it('round-trips an eight-deck shoe and validates and cleans its active rules', () => {
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame, playerKeys: ['chris', 'dealer'],
      tableRules: { numberOfDecks: '8', dealerSoft17: 'hit', blackjackPayout: '6:5' },
    });
    const snapshot = gameSnapshot(state);
    const padded = { ...snapshot, game: { ...snapshot.game, tableRules: { ...snapshot.game.tableRules, extra: true } } };
    expect(parseGameBody(body(padded))).toEqual({ data: snapshot });
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, tableRules: undefined } })).toBe(false);
    expect(isGameSnapshot({
      ...snapshot, game: { ...snapshot.game, tableRules: { ...snapshot.game.tableRules, numberOfDecks: '100' } },
    })).toBe(false);
    const { tableRules, ...legacyGame } = snapshot.game;
    expect(isGameSnapshot({ ...snapshot, game: { ...legacyGame, version: 4 } })).toBe(true);
    expect(parseGameBody(body({ ...snapshot, game: { ...legacyGame, version: 4, tableRules: null } }))).toHaveProperty('error');
  });

  it('returns the snapshot with unknown keys removed at every level and the rest intact', () => {
    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(dealt())));
    const padded = {
      ...snapshot,
      extra: 1,
      game: { ...snapshot.game, extra: 2, activityLog: snapshot.game.activityLog.map((entry: object) => ({ ...entry, $where: 'x' })) },
      deck: { ...snapshot.deck, extra: 3, playerHands: { ...snapshot.deck.playerHands, chris: { ...snapshot.deck.playerHands.chris, 'a.b': true } } },
      players: { ...snapshot.players, extra: 4, players: { ...snapshot.players.players, chris: { ...snapshot.players.players.chris, $set: {} } } },
    };
    const parsed = parseGameBody(body(padded));
    expect(parsed).toEqual({ data: snapshot });
    expect(JSON.stringify(parsed)).not.toMatch(/extra|\$where|a\.b|\$set/);
  });

  it('rejects over-long text, unknown card keys, and values outside their enumerations', () => {
    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(dealt())));
    const entry = snapshot.game.activityLog[0];
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, activityLog: [{ ...entry, description: 'x'.repeat(201) }] } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, activityLog: [{ ...entry, event: 'hack' }] } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, deck: { ...snapshot.deck, cardKeys: ['<script>'] } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, deck: { ...snapshot.deck, drawnKeys: ['Spade_7_'.repeat(8)] } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, players: { ...snapshot.players, players: { ...snapshot.players.players, chris: { ...snapshot.players.players.chris, role: 'admin' } } } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, players: { ...snapshot.players, players: { ...snapshot.players.players, chris: { ...snapshot.players.players.chris, title: 'x'.repeat(41) } } } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, players: { ...snapshot.players, players: { ...snapshot.players.players, chris: { ...snapshot.players.players.chris, stats: { hacked: 'yes' } } } } })).toBe(false);
  });

  it('validates botAccounts, seated awayTask and isReadyToReturn, work activity events, and legacy v5 snapshots without botAccounts', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor(profiles),
      botAccounts: {
        ogion: {
          bank: 300,
          balanceHistory: [1000, 0, 300],
          work: { status: 'ready', taskId: 'herding-goats', daysWorked: 3 },
          taskOverride: 'herding-goats',
          allowReturn: false,
        },
      },
    });
    state.activityLog.push({
      id: 42,
      timestamp: 1000,
      name: 'Ogion',
      description: 'has $300 and wants back in',
      event: 'work',
    });

    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(state)));
    const padded = {
      ...snapshot,
      game: {
        ...snapshot.game,
        botAccounts: {
          ...snapshot.game.botAccounts,
          ogion: {
            ...snapshot.game.botAccounts.ogion,
            secretAccountKey: 1,
            work: { ...snapshot.game.botAccounts.ogion.work, extraWorkKey: 'strip-me' },
          },
        },
      },
    };

    const parsed = parseGameBody(body(padded));
    expect(parsed).toEqual({ data: snapshot });
    expect(JSON.stringify(parsed)).not.toMatch(/secretAccountKey|extraWorkKey/);

    // Legacy v5 snapshot without botAccounts is accepted
    const { botAccounts, ...v5Game } = snapshot.game;
    expect(isGameSnapshot({ ...snapshot, game: { ...v5Game, version: 5 } })).toBe(true);
  });

  it('rejects invalid botAccounts, awayTask, and isReadyToReturn fields', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor(profiles),
    });
    const snapshot = JSON.parse(JSON.stringify(gameSnapshot(state)));

    expect(isGameSnapshot({
      ...snapshot,
      players: {
        ...snapshot.players,
        players: {
          ...snapshot.players.players,
          ogion: { ...snapshot.players.players.ogion, awayTask: 'invalid-task' },
        },
      },
    })).toBe(false);

    expect(isGameSnapshot({
      ...snapshot,
      players: {
        ...snapshot.players,
        players: {
          ...snapshot.players.players,
          ogion: { ...snapshot.players.players.ogion, isReadyToReturn: 'yes' },
        },
      },
    })).toBe(false);

    for (const badBotAccounts of [
      [],
      'none',
      { ...snapshot.game.botAccounts, chris: { bank: 100, balanceHistory: [100] } },
      { ...snapshot.game.botAccounts, ogion: { bank: -5, balanceHistory: [100] } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: Array.from({ length: 201 }, () => 100) } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: [100], work: { status: 'idle', taskId: 'smashing-rocks', daysWorked: 0 } } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: [100], work: { status: 'working', taskId: 'unknown', daysWorked: 0 } } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: [100], work: { status: 'working', taskId: 'smashing-rocks', daysWorked: 99 } } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: [100], taskOverride: 'unknown' } },
      { ...snapshot.game.botAccounts, ogion: { bank: 100, balanceHistory: [100], allowReturn: 1 } },
    ]) {
      expect(isGameSnapshot({ ...snapshot, game: { ...snapshot.game, botAccounts: badBotAccounts } })).toBe(false);
    }
  });

  it('rejects bodies that are too large, not JSON, or the wrong shape', () => {
    expect(parseGameBody('x'.repeat(GAME_MAX_BODY_BYTES + 1))).toEqual({ error: 'Body too large.' });
    expect(parseGameBody('{nope')).toEqual({ error: 'Body is not valid JSON.' });
    expect(parseGameBody('{}')).toEqual({ error: 'Body must be { game: GameSnapshot }.' });
    expect(parseGameBody(body({ deck: {}, players: {}, game: {} }))).toHaveProperty('error');
  });
});
