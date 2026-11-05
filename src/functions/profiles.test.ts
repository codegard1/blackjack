import { describe, expect, it } from 'vitest';
import { GameAction } from '../enums';
import { createGameState } from '../context';
import { gameReducer } from './gameReducer';
import { DEALER_PROFILE_ID, defaultProfileState, emptyStats, normalizeProfileState, profileReducer, seatsFor, summarizeStats, validateProfileName } from './profiles';
import { PlayerStats, ProfileState } from '../types';

describe('validateProfileName', () => {
  const profiles = defaultProfileState().profiles;

  it('accepts a new name and rejects empty, long, duplicate and reserved names', () => {
    expect(validateProfileName('Alex', profiles)).toBeUndefined();
    expect(validateProfileName('   ', profiles)).toBe('Enter a name.');
    expect(validateProfileName('x'.repeat(21), profiles)).toBe('Names can be up to 20 characters.');
    expect(validateProfileName('CHRIS', profiles)).toBe('That name is already in use.');
    expect(validateProfileName('dealer', profiles)).toBe('That name is already in use.');
  });
});

describe('profileReducer', () => {
  it('creates a human profile with empty stats and selects it', () => {
    const state = profileReducer(defaultProfileState(), { type: 'create', name: ' Alex ' });

    const alex = state.profiles.find((profile) => profile.name === 'Alex');
    expect(alex?.stats).toEqual(emptyStats());
    expect(state.selectedId).toBe(alex?.id);
  });

  it('ignores a name that is not valid', () => {
    const before = defaultProfileState();
    expect(profileReducer(before, { type: 'create', name: 'Chris' })).toBe(before);
  });

  it('only selects human profiles', () => {
    const state = defaultProfileState();
    expect(profileReducer(state, { type: 'select', id: DEALER_PROFILE_ID })).toBe(state);
    expect(profileReducer(state, { type: 'select', id: 'chris' })).toEqual(state);
    expect(profileReducer(state, { type: 'select', id: 'nobody' })).toBe(state);
  });

  it('copies synced stats onto the matching profiles only', () => {
    const stats: PlayerStats = { ...emptyStats(), numberOfGamesPlayed: 3, numberOfGamesWon: 2 };
    const state = profileReducer(defaultProfileState(), { type: 'syncStats', stats: { chris: stats } });

    expect(state.profiles.find((profile) => profile.id === 'chris')?.stats).toEqual(stats);
    expect(state.profiles.find((profile) => profile.id === DEALER_PROFILE_ID)?.stats).toEqual(emptyStats());
  });

  it('returns to the default profiles on reset', () => {
    const created = profileReducer(defaultProfileState(), { type: 'create', name: 'Alex' });
    expect(profileReducer(created, { type: 'reset' })).toEqual(defaultProfileState());
  });
});

describe('normalizeProfileState', () => {
  it('fills in missing stats, restores the dealer and selects a human when the selection is invalid', () => {
    const stored = {
      profiles: [{ id: 'alex', name: 'Alex', createdAt: 1, stats: { numberOfGamesPlayed: 2 } }],
      selectedId: DEALER_PROFILE_ID,
    } as unknown as ProfileState;

    const state = normalizeProfileState(stored);

    expect(state.profiles.map((profile) => profile.id)).toEqual(['alex', DEALER_PROFILE_ID]);
    expect(state.profiles[0].stats).toEqual({ ...emptyStats(), numberOfGamesPlayed: 2 });
    expect(state.selectedId).toBe('alex');
  });
});

describe('seatsFor', () => {
  it('seats the selected player first, then the dealer, each with their lifetime stats', () => {
    const state = profileReducer(defaultProfileState(), { type: 'create', name: 'Alex' });
    const [human, dealer] = seatsFor(state);

    expect(human).toMatchObject({ key: state.selectedId, title: 'Alex', isNPC: false, bank: 1000 });
    expect(dealer).toMatchObject({ key: DEALER_PROFILE_ID, title: 'Dealer', isNPC: true, bank: 1000 });
  });

  it('carries the stats into a new game, so they accumulate across games', () => {
    const stats: PlayerStats = { ...emptyStats(), numberOfGamesPlayed: 4, numberOfGamesWon: 1 };
    const state = profileReducer(defaultProfileState(), { type: 'syncStats', stats: { chris: stats } });

    const game = gameReducer(createGameState(), { type: GameAction.NewGame, players: seatsFor(state) });

    expect(game.playerStore.player('chris').stats).toEqual(stats);
    expect(game.playerStore.player('dealer').stats).toEqual(emptyStats());
  });
});

describe('summarizeStats', () => {
  it('derives the pushes and win rate from the raw counts', () => {
    const summary = summarizeStats({
      ...emptyStats(),
      numberOfGamesPlayed: 4,
      numberOfGamesWon: 2,
      numberOfGamesLost: 1,
      numberOfTimesBlackjack: 1,
      numberOfTimesBusted: 1,
      totalWinnings: 120,
    });

    expect(summary).toMatchObject({ rounds: 4, won: 2, lost: 1, pushed: 1, winRate: 0.5, blackjacks: 1, busts: 1, potsWon: 120 });
  });

  it('has no win rate before a round has been played', () => {
    expect(summarizeStats(emptyStats()).winRate).toBeUndefined();
  });
});
