import { describe, expect, it } from 'vitest';
import { GameAction } from '../../shared';
import { createGameState } from './GameContext';
import { gameReducer } from './gameReducer';
import { botAccountsFor, DEALER_PROFILE_ID, defaultProfileState, emptyStats, mergeProfileStates, mergeStats, MAX_PROFILES, normalizeProfileState, profileReducer, seatsFor, summarizeStats, validateProfileName } from './profiles';
import { MAX_BALANCE_HISTORY, PlayerStats, ProfileState } from '../../shared';

describe('validateProfileName', () => {
  const profiles = defaultProfileState().profiles;

  it('accepts a new name and rejects empty, long, duplicate and reserved names', () => {
    expect(validateProfileName('Alex', profiles)).toBeUndefined();
    expect(validateProfileName('   ', profiles)).toBe('Enter a name.');
    expect(validateProfileName('x'.repeat(21), profiles)).toBe('Names can be up to 20 characters.');
    expect(validateProfileName('CHRIS', profiles)).toBe('That name is already in use.');
    expect(validateProfileName('dealer', profiles)).toBe('That name is already in use.');
    expect(validateProfileName('ogion', profiles)).toBe('That name is already in use.');
  });

  it('stops at the number of profiles the server stores', () => {
    let state = defaultProfileState();
    while (state.profiles.length < MAX_PROFILES) state = profileReducer(state, { type: 'create', name: `Player ${state.profiles.length}` });
    expect(state.profiles).toHaveLength(MAX_PROFILES);
    expect(validateProfileName('One more', state.profiles)).toMatch(/up to 50 profiles/);
    expect(profileReducer(state, { type: 'create', name: 'One more' })).toBe(state);
  });
});

describe('profileReducer', () => {
  it('creates a human profile with empty stats and selects it', () => {
    const state = profileReducer(defaultProfileState(), { type: 'create', name: ' Alex ' });

    const alex = state.profiles.find((profile) => profile.name === 'Alex');
    expect(alex?.stats).toEqual(emptyStats());
    expect(state.selectedId).toBe(alex?.id);
  });

  it('replaces the store with a repaired copy from the server', () => {
    const remote = { profiles: [{ id: 'alex', name: 'Alex', createdAt: 1, stats: { numberOfGamesWon: 2 } as PlayerStats }], selectedId: 'alex', opponentIds: ['ogion', 'bogus'] };
    const state = profileReducer(defaultProfileState(), { type: 'replace', state: remote });

    expect(state.selectedId).toBe('alex');
    expect(state.profiles.find((profile) => profile.id === 'alex')?.stats).toEqual({ ...emptyStats(), numberOfGamesWon: 2 });
    expect(state.profiles.some((profile) => profile.id === DEALER_PROFILE_ID)).toBe(true);
    expect(state.opponentIds).toEqual(['ogion']);
    expect(normalizeProfileState(state)).toEqual(state);
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

  it('syncs botAccounts onto bot profiles with balanceHistory capped at MAX_BALANCE_HISTORY and ignores non-bots', () => {
    const longHistory = Array.from({ length: MAX_BALANCE_HISTORY + 5 }, (_, index) => index);
    const state = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: {},
      botAccounts: {
        ogion: {
          bank: 320,
          balanceHistory: longHistory,
          work: { status: 'working', taskId: 'herding-goats', daysWorked: 2 },
          taskOverride: 'herding-goats',
          allowReturn: true,
        },
        chris: {
          bank: 50,
          balanceHistory: [50],
        },
      },
    });

    const ogion = state.profiles.find((profile) => profile.id === 'ogion');
    expect(ogion).toMatchObject({
      bank: 320,
      work: { status: 'working', taskId: 'herding-goats', daysWorked: 2 },
      taskOverride: 'herding-goats',
      allowReturn: true,
    });
    expect(ogion?.balanceHistory).toHaveLength(MAX_BALANCE_HISTORY);
    expect(ogion?.balanceHistory?.at(0)).toBe(5);
    expect(ogion?.balanceHistory?.at(-1)).toBe(MAX_BALANCE_HISTORY + 4);
    expect(state.profiles.find((profile) => profile.id === 'chris')?.bank).toBeUndefined();
  });

  it('configures work overrides and allowReturn for bots, switches active work tasks, and ignores non-bots', () => {
    let state = defaultProfileState();
    // Non-bot IDs are ignored
    expect(profileReducer(state, { type: 'configureWork', id: 'chris', taskOverride: 'smashing-rocks' })).toBe(state);
    expect(profileReducer(state, { type: 'configureWork', id: DEALER_PROFILE_ID, allowReturn: true })).toBe(state);

    // Setting taskOverride and then toggling allowReturn in separate actions while at the table preserves taskOverride
    state = profileReducer(state, { type: 'configureWork', id: 'ogion', taskOverride: 'minding-ansible' });
    expect(state.profiles.find((profile) => profile.id === 'ogion')).toMatchObject({
      taskOverride: 'minding-ansible',
      allowReturn: false,
    });
    state = profileReducer(state, { type: 'configureWork', id: 'ogion', allowReturn: true });
    expect(state.profiles.find((profile) => profile.id === 'ogion')).toMatchObject({
      taskOverride: 'minding-ansible',
      allowReturn: true,
    });

    // Put Ogion to work on gobrin-ice (daysWorked: 3, bank: 10)
    state = profileReducer(state, {
      type: 'syncStats',
      stats: {},
      botAccounts: {
        ogion: {
          bank: 10,
          balanceHistory: [1000, 10],
          work: { status: 'working', taskId: 'gobrin-ice', daysWorked: 3 },
          taskOverride: 'gobrin-ice',
          allowReturn: false,
        },
      },
    });

    // Changing taskOverride while working switches task and resets daysWorked to 0
    state = profileReducer(state, { type: 'configureWork', id: 'ogion', taskOverride: 'smashing-rocks' });
    expect(state.profiles.find((profile) => profile.id === 'ogion')).toMatchObject({
      taskOverride: 'smashing-rocks',
      work: { status: 'working', taskId: 'smashing-rocks', daysWorked: 0 },
    });

    // Clearing taskOverride with null reverts to Ogion's own pick (gobrin-ice at $10 bank) and resets daysWorked to 0
    state = profileReducer(state, { type: 'configureWork', id: 'ogion', taskOverride: null });
    const revertedOgion = state.profiles.find((profile) => profile.id === 'ogion');
    expect(revertedOgion?.taskOverride).toBeUndefined();
    expect(revertedOgion?.work).toEqual({ status: 'working', taskId: 'gobrin-ice', daysWorked: 0 });

    // When a bot is in 'ready' status, enabling allowReturn immediately clears work and taskOverride
    state = profileReducer(state, {
      type: 'syncStats',
      stats: {},
      botAccounts: {
        ogion: {
          bank: 300,
          balanceHistory: [1000, 10, 300],
          work: { status: 'ready', taskId: 'gobrin-ice', daysWorked: 7 },
          taskOverride: 'gobrin-ice',
          allowReturn: false,
        },
      },
    });
    state = profileReducer(state, { type: 'configureWork', id: 'ogion', allowReturn: true });
    const returnedOgion = state.profiles.find((profile) => profile.id === 'ogion');
    expect(returnedOgion?.allowReturn).toBe(true);
    expect(returnedOgion?.work).toBeUndefined();
    expect(returnedOgion?.taskOverride).toBeUndefined();
  });

  it('seats and unseats computer players, up to four, in seating order', () => {
    let state = profileReducer(defaultProfileState(), { type: 'toggleOpponent', id: 'haber' });
    state = profileReducer(state, { type: 'toggleOpponent', id: 'ogion' });
    expect(state.opponentIds).toEqual(['ogion', 'haber']);

    state = profileReducer(state, { type: 'toggleOpponent', id: 'haber' });
    expect(state.opponentIds).toEqual(['ogion']);
    expect(profileReducer(state, { type: 'toggleOpponent', id: 'chris' })).toBe(state);
    expect(profileReducer(state, { type: 'toggleOpponent', id: DEALER_PROFILE_ID })).toBe(state);
  });

  it('returns to the default profiles on reset', () => {
    const created = profileReducer(defaultProfileState(), { type: 'create', name: 'Alex' });
    expect(profileReducer(created, { type: 'reset' })).toEqual(defaultProfileState());
  });
});

describe('normalizeProfileState', () => {
  it('fills in missing stats, restores the characters and selects a human when the selection is invalid', () => {
    const stored = {
      profiles: [
        { id: 'alex', name: 'Alex', createdAt: 1, stats: { numberOfGamesPlayed: 2 } },
        { id: DEALER_PROFILE_ID, name: 'Dealer', createdAt: 0, stats: {} },
      ],
      selectedId: DEALER_PROFILE_ID,
      opponentIds: ['shevek', 'nobody', 'chris'],
    } as unknown as ProfileState;

    const state = normalizeProfileState(stored);

    expect(state.profiles.map((profile) => profile.id)).toEqual(['alex', DEALER_PROFILE_ID, 'ogion', 'shevek', 'haber', 'genly-ai']);
    expect(state.profiles[0].stats).toEqual({ ...emptyStats(), numberOfGamesPlayed: 2 });
    // a dealer saved under the old name takes the character's name
    expect(state.profiles[1].name).toBe('Faxe');
    expect(state.selectedId).toBe('alex');
    expect(state.opponentIds).toEqual(['shevek']);
  });

  it('initializes default bot accounts and repairs invalid bot fields during normalization', () => {
    const defaults = defaultProfileState();
    for (const botId of ['ogion', 'shevek', 'haber', 'genly-ai']) {
      expect(defaults.profiles.find((profile) => profile.id === botId)).toMatchObject({
        bank: 1000,
        balanceHistory: [1000],
        allowReturn: false,
      });
    }
    expect(defaults.profiles.find((profile) => profile.id === 'chris')?.bank).toBeUndefined();
    expect(defaults.profiles.find((profile) => profile.id === DEALER_PROFILE_ID)?.bank).toBeUndefined();

    const maxHistory = Array.from({ length: MAX_BALANCE_HISTORY }, (_, index) => index + 1);
    const corrupted = {
      profiles: [
        { id: 'chris', name: 'Chris', createdAt: 0, stats: emptyStats() },
        {
          id: 'ogion',
          name: 'Ogion',
          createdAt: 0,
          stats: emptyStats(),
          bank: -50,
          balanceHistory: [],
          work: { status: 'invalid', taskId: 'bogus', daysWorked: -1 },
          taskOverride: 'bogus-task',
          allowReturn: 'yes',
        },
        {
          id: 'shevek',
          name: 'Shevek',
          createdAt: 0,
          stats: emptyStats(),
          bank: 450,
          balanceHistory: maxHistory,
          work: { status: 'working', taskId: 'minding-ansible', daysWorked: 2 },
          taskOverride: 'minding-ansible',
          allowReturn: true,
        },
        {
          id: 'haber',
          name: 'Haber',
          createdAt: 0,
          stats: emptyStats(),
          bank: 120,
          balanceHistory: Array.from({ length: MAX_BALANCE_HISTORY + 5 }, () => 120),
        },
      ],
      selectedId: 'chris',
      opponentIds: ['ogion', 'shevek'],
    } as unknown as ProfileState;

    const normalized = normalizeProfileState(corrupted);
    const ogion = normalized.profiles.find((profile) => profile.id === 'ogion');
    expect(ogion).toMatchObject({
      bank: 1000,
      balanceHistory: [1000],
      allowReturn: false,
    });
    expect(ogion?.work).toBeUndefined();
    expect(ogion?.taskOverride).toBeUndefined();

    const shevek = normalized.profiles.find((profile) => profile.id === 'shevek');
    expect(shevek?.bank).toBe(450);
    expect(shevek?.balanceHistory).toHaveLength(MAX_BALANCE_HISTORY);
    expect(shevek?.balanceHistory?.at(0)).toBe(1);
    expect(shevek?.work).toEqual({ status: 'working', taskId: 'minding-ansible', daysWorked: 2 });
    expect(shevek?.taskOverride).toBe('minding-ansible');
    expect(shevek?.allowReturn).toBe(true);

    const haber = normalized.profiles.find((profile) => profile.id === 'haber');
    expect(haber?.bank).toBe(120);
    expect(haber?.balanceHistory).toEqual([120]);

    const accounts = botAccountsFor(normalized);
    expect(accounts.ogion).toEqual({ bank: 1000, balanceHistory: [1000], allowReturn: false });
    expect(accounts.shevek.bank).toBe(450);
    expect(accounts.shevek.work).toEqual({ status: 'working', taskId: 'minding-ansible', daysWorked: 2 });
  });
});

describe('seatsFor', () => {
  it('seats the selected player first, then the dealer, each with their lifetime stats', () => {
    const state = profileReducer(defaultProfileState(), { type: 'create', name: 'Alex' });
    const [human, dealer] = seatsFor(state);

    expect(human).toMatchObject({ key: state.selectedId, title: 'Alex', isNPC: false, bank: 1000 });
    expect(dealer).toMatchObject({ key: DEALER_PROFILE_ID, title: 'Faxe', isNPC: true, role: 'dealer', bank: 1000 });
  });

  it('seats the chosen computer players between the human and the dealer', () => {
    const state = { ...defaultProfileState(), opponentIds: ['shevek', 'genly-ai'] };
    expect(seatsFor(state).map((seat) => [seat.key, seat.role])).toEqual([
      ['chris', 'human'], ['shevek', 'bot'], ['genly-ai', 'bot'], [DEALER_PROFILE_ID, 'dealer'],
    ]);
  });

  it('carries the stats into a new game, so they accumulate across games', () => {
    const stats: PlayerStats = { ...emptyStats(), numberOfGamesPlayed: 4, numberOfGamesWon: 1 };
    const state = profileReducer(defaultProfileState(), { type: 'syncStats', stats: { chris: stats } });

    const game = gameReducer(createGameState(), { type: GameAction.NewGame, players: seatsFor(state) });

    expect(game.playerStore.players.chris.stats).toEqual(stats);
    expect(game.playerStore.players.dealer.stats).toEqual(emptyStats());
  });

  it('carries persistent bot banks and away-working or ready flags onto seated bots while human and dealer start at 1000', () => {
    let state = { ...defaultProfileState(), opponentIds: ['ogion', 'shevek'] };
    state = profileReducer(state, {
      type: 'syncStats',
      stats: {},
      botAccounts: {
        ogion: {
          bank: 180,
          balanceHistory: [1000, 180],
          work: { status: 'working', taskId: 'herding-goats', daysWorked: 1 },
          allowReturn: false,
        },
        shevek: {
          bank: 300,
          balanceHistory: [1000, 0, 300],
          work: { status: 'ready', taskId: 'gobrin-ice', daysWorked: 7 },
          allowReturn: false,
        },
      },
    });

    const [chris, ogion, shevek, dealer] = seatsFor(state);
    expect(chris).toMatchObject({ key: 'chris', role: 'human', bank: 1000 });
    expect(ogion).toMatchObject({
      key: 'ogion',
      role: 'bot',
      bank: 180,
      isSittingOut: true,
      awayTask: 'herding-goats',
      isReadyToReturn: false,
    });
    expect(shevek).toMatchObject({
      key: 'shevek',
      role: 'bot',
      bank: 300,
      isSittingOut: true,
      awayTask: 'gobrin-ice',
      isReadyToReturn: true,
    });
    expect(dealer).toMatchObject({ key: DEALER_PROFILE_ID, role: 'dealer', bank: 1000 });
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
      netResult: -40,
    });

    expect(summary).toMatchObject({ rounds: 4, won: 2, lost: 1, pushed: 1, winRate: 0.5, blackjacks: 1, busts: 1, net: -40 });
  });

  it('has no win rate before a round has been played', () => {
    expect(summarizeStats(emptyStats()).winRate).toBeUndefined();
  });
});

describe('mergeStats and mergeProfileStates', () => {
  it('sums stat counts and recomputes the win-loss ratio', () => {
    const first: PlayerStats = {
      ...emptyStats(),
      numberOfGamesPlayed: 4,
      numberOfGamesWon: 3,
      numberOfGamesLost: 1,
      numberOfTimesBlackjack: 1,
      numberOfTimesBusted: 0,
      totalWinnings: 150,
      netResult: 100,
    };
    const second: PlayerStats = {
      ...emptyStats(),
      numberOfGamesPlayed: 6,
      numberOfGamesWon: 2,
      numberOfGamesLost: 3,
      numberOfTimesBlackjack: 0,
      numberOfTimesBusted: 2,
      totalWinnings: 100,
      netResult: -50,
    };

    expect(mergeStats(first, second)).toEqual({
      numberOfGamesPlayed: 10,
      numberOfGamesWon: 5,
      numberOfGamesLost: 4,
      numberOfTimesBlackjack: 1,
      numberOfTimesBusted: 2,
      totalWinnings: 250,
      netResult: 50,
      winLossRatio: 50,
    });
  });

  it('combines matching human profiles by name, sums character stats, and adds new local profiles', () => {
    let remote = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: {
        chris: { ...emptyStats(), numberOfGamesPlayed: 10, numberOfGamesWon: 5, netResult: 50 },
        [DEALER_PROFILE_ID]: { ...emptyStats(), numberOfGamesPlayed: 10, numberOfGamesWon: 4, netResult: -50 },
      },
    });
    remote = profileReducer(remote, { type: 'toggleOpponent', id: 'ogion' });

    let local = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: {
        chris: { ...emptyStats(), numberOfGamesPlayed: 2, numberOfGamesWon: 1, netResult: 25 },
        [DEALER_PROFILE_ID]: { ...emptyStats(), numberOfGamesPlayed: 2, numberOfGamesWon: 1, netResult: -25 },
      },
    });
    local = profileReducer(local, { type: 'create', name: 'Alex' });

    const merged = mergeProfileStates(remote, local);
    const chris = merged.profiles.find((p) => p.id === 'chris');
    const dealer = merged.profiles.find((p) => p.id === DEALER_PROFILE_ID);
    const alex = merged.profiles.find((p) => p.name === 'Alex');

    expect(chris?.stats.numberOfGamesPlayed).toBe(12);
    expect(chris?.stats.numberOfGamesWon).toBe(6);
    expect(chris?.stats.netResult).toBe(75);
    expect(dealer?.stats.numberOfGamesPlayed).toBe(12);
    expect(alex).toBeDefined();
    expect(merged.selectedId).toBe('chris');
    expect(merged.opponentIds).toEqual(['ogion']);
  });

  it('leaves remote profiles untouched when local has no progress', () => {
    const remote = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: { chris: { ...emptyStats(), numberOfGamesPlayed: 5, numberOfGamesWon: 3 } },
    });
    expect(mergeProfileStates(remote, defaultProfileState())).toEqual(remote);
  });

  it('preserves local bot account state alongside stats when remote is untouched', () => {
    const remote = defaultProfileState();
    let local = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: { ogion: { ...emptyStats(), numberOfGamesPlayed: 2, numberOfGamesWon: 1, netResult: -950 } },
      botAccounts: {
        ogion: {
          bank: 50,
          balanceHistory: [1000, 50],
          work: { status: 'working', taskId: 'herding-goats', daysWorked: 1 },
          taskOverride: 'smashing-rocks',
          allowReturn: true,
        },
      },
    });
    local = profileReducer(local, { type: 'configureWork', id: 'shevek', allowReturn: true });

    const merged = mergeProfileStates(remote, local);
    const ogion = merged.profiles.find((p) => p.id === 'ogion');
    const shevek = merged.profiles.find((p) => p.id === 'shevek');

    expect(ogion).toMatchObject({
      bank: 50,
      balanceHistory: [1000, 50],
      work: { status: 'working', taskId: 'herding-goats', daysWorked: 1 },
      taskOverride: 'smashing-rocks',
      allowReturn: true,
    });
    expect(ogion?.stats.numberOfGamesPlayed).toBe(2);
    expect(ogion?.stats.numberOfGamesWon).toBe(1);
    expect(ogion?.stats.netResult).toBe(-950);
    expect(shevek?.allowReturn).toBe(true);

    // Even when only bot account settings changed locally without any played hands, merging preserves them
    const botConfigOnly = profileReducer(defaultProfileState(), {
      type: 'configureWork',
      id: 'haber',
      taskOverride: 'divlab-posting',
      allowReturn: true,
    });
    const mergedBotOnly = mergeProfileStates(remote, botConfigOnly);
    expect(mergedBotOnly.profiles.find((p) => p.id === 'haber')).toMatchObject({
      taskOverride: 'divlab-posting',
      allowReturn: true,
    });
  });

  it('keeps remote bot account state while summing character stats when remote already has progress', () => {
    const remote = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: { ogion: { ...emptyStats(), numberOfGamesPlayed: 5, numberOfGamesWon: 3, netResult: 200 } },
      botAccounts: {
        ogion: {
          bank: 1200,
          balanceHistory: [1000, 1200],
          allowReturn: false,
        },
      },
    });
    const local = profileReducer(defaultProfileState(), {
      type: 'syncStats',
      stats: { ogion: { ...emptyStats(), numberOfGamesPlayed: 2, numberOfGamesWon: 1, netResult: -950 } },
      botAccounts: {
        ogion: {
          bank: 50,
          balanceHistory: [1000, 50],
          work: { status: 'working', taskId: 'herding-goats', daysWorked: 1 },
          taskOverride: 'smashing-rocks',
          allowReturn: true,
        },
      },
    });

    const merged = mergeProfileStates(remote, local);
    const ogion = merged.profiles.find((p) => p.id === 'ogion');

    expect(ogion).toMatchObject({
      bank: 1200,
      balanceHistory: [1000, 1200],
      allowReturn: false,
    });
    expect(ogion?.work).toBeUndefined();
    expect(ogion?.taskOverride).toBeUndefined();
    expect(ogion?.stats.numberOfGamesPlayed).toBe(7);
    expect(ogion?.stats.numberOfGamesWon).toBe(4);
    expect(ogion?.stats.netResult).toBe(-750);
  });
});
