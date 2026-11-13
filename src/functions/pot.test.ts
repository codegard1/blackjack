import { describe, expect, it } from 'vitest';
import { createGameState } from '../context';
import { GameAction } from '../enums';
import { GameState } from '../types';
import { gameReducer } from './gameReducer';
import { potBreakdown } from './pot';

const started = (): GameState => {
  const game = gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });
  return gameReducer(game, { type: GameAction.EvaluateGame, gameStatus: game.gameStatus });
};
const wager = (state: GameState): GameState => gameReducer(state, { type: GameAction.Bet, playerKey: 'chris', betAmount: 25 });
const total = (state: GameState): number => potBreakdown(state).reduce((sum, share) => sum + share.amount, 0);

describe('potBreakdown', () => {
  it('has nothing to show before any money is in the pot', () => {
    expect(potBreakdown(createGameState())).toEqual([]);
  });

  it("adds up each player's ante and wagers, and accounts for the whole pot", () => {
    const anted = started();
    const game = wager(wager(anted));
    const before = potBreakdown(anted).find((share) => share.playerKey === 'chris');
    const after = potBreakdown(game).find((share) => share.playerKey === 'chris');
    expect(after?.name).toBe('Chris');
    expect(after?.amount).toBe((before?.amount ?? 0) + 50);
    expect(game.pot).toBeGreaterThan(0);
    expect(total(game)).toBe(game.pot);
  });

  it('has one line per player, however many times they put money in', () => {
    const game = wager(wager(started()));
    const names = potBreakdown(game).map((share) => share.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
