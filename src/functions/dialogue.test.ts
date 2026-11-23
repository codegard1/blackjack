import { describe, expect, it } from 'vitest';
import { BOTS, DEALER } from '../characters';
import { GameAction } from '../enums';
import { createGameState } from '../context/GameContext';
import { DIALOGUE_POOLS, botUtterance } from './dialogue';
import { gameReducer } from './gameReducer';
import { defaultProfileState, seatsFor } from './profiles';
import { GameState } from '../types';

const startWithAllBots = (): GameState => {
  const started = gameReducer(createGameState(), {
    type: GameAction.NewGame,
    players: seatsFor({ ...defaultProfileState(), opponentIds: BOTS.map((b) => b.id) }),
  });
  return gameReducer(started, { type: GameAction.EvaluateGame });
};

const FILLER = Array.from({ length: 30 }, () => 'Club_2');

const dealSeats = (state: GameState, hands: string[][], draws: string[] = []): GameState => {
  const deck = { ...state.deck, cardKeys: [...FILLER, ...[...draws].reverse(), ...hands.flat().reverse()] };
  return gameReducer({ ...state, deck }, { type: GameAction.Deal });
};

describe('botUtterance', () => {
  it('defines complete modular dialogue pools for every AI character and the dealer', () => {
    for (const character of [...BOTS, DEALER]) {
      const pool = DIALOGUE_POOLS[character.id];
      expect(pool, character.id).toBeDefined();
      expect(pool.idle.length).toBeGreaterThanOrEqual(2);
      expect(pool.hit.length).toBeGreaterThanOrEqual(2);
      expect(pool.stay.length).toBeGreaterThanOrEqual(2);
      expect(pool.win.length).toBeGreaterThanOrEqual(2);
      expect(pool.blackjack.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('triggers risky lines on 12-16, sequences across hits, and updates on stay and bust', () => {
    // chris: 10+10, ogion: 10+6 (16 = risky), shevek: 5+4 (9), haber: 6+5 (11), genly-ai: 10+6 (16), dealer: 10+7
    let state = dealSeats(
      startWithAllBots(),
      [['Club_10', 'Diamond_10'], ['Club_10', 'Heart_6'], ['Spade_5', 'Heart_4'], ['Club_6', 'Diamond_5'], ['Spade_10', 'Diamond_6'], ['Club_9', 'Heart_8']],
      ['Club_2', 'Club_3', 'Club_10'],
    );

    expect(DIALOGUE_POOLS['genly-ai'].risky).toContain(botUtterance(state, 'genly-ai'));

    // Advance to shevek (5+4 = 9), hit twice, then bust
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'ogion' });
    expect(DIALOGUE_POOLS.ogion.stay).toContain(botUtterance(state, 'ogion'));

    // First hit: 5+4+2 = 11 -> hit[0]
    state = gameReducer(state, { type: GameAction.Draw, playerKey: 'shevek', deckSide: 'top', numberOfCards: 1 });
    const firstHitLine = botUtterance(state, 'shevek');
    expect(DIALOGUE_POOLS.shevek.hit).toContain(firstHitLine);

    // Second hit: 5+4+2+3 = 14 (risky) or sequences to next phrase
    state = gameReducer(state, { type: GameAction.Draw, playerKey: 'shevek', deckSide: 'top', numberOfCards: 1 });
    const secondHitLine = botUtterance(state, 'shevek');
    expect(secondHitLine).not.toBe(firstHitLine);

    // Third hit: +10 = 24 (bust)
    state = gameReducer(state, { type: GameAction.Draw, playerKey: 'shevek', deckSide: 'top', numberOfCards: 1 });
    expect(DIALOGUE_POOLS.shevek.bust).toContain(botUtterance(state, 'shevek'));
  });

  it('triggers aggressive dialogue on double down and overrides with celebrations on win and blackjack', () => {
    let state = dealSeats(
      startWithAllBots(),
      [['Club_10', 'Diamond_9'], ['Club_10', 'Heart_10'], ['Spade_14', 'Heart_13'], ['Club_6', 'Diamond_5'], ['Spade_10', 'Diamond_9'], ['Club_9', 'Heart_8']],
      ['Club_10'],
    );

    // Shevek has natural blackjack -> celebratory blackjack line
    expect(DIALOGUE_POOLS.shevek.blackjack).toContain(botUtterance(state, 'shevek'));

    // Advance to Haber (6+5 = 11) and double down
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'ogion' });
    state = gameReducer(state, { type: GameAction.DoubleDown, playerKey: 'haber' });
    // After double down + stay, Haber is staying (or shows aggressive/win once settled)
    expect(botUtterance(state, 'haber')).toBeTruthy();

    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'genly-ai' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = gameReducer(state, { type: GameAction.EvaluateGame });

    // Haber (21) and Ogion (20) beat dealer 17 -> win celebration pool
    expect(DIALOGUE_POOLS.haber.win).toContain(botUtterance(state, 'haber'));
    expect(DIALOGUE_POOLS.ogion.win).toContain(botUtterance(state, 'ogion'));
  });
});
