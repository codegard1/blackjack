import { describe, expect, it } from 'vitest';
import { GameAction, GameStatus, StoreName } from '../../shared';
import { getPlayerHands } from '../game/deck';
import { gameReducer } from '../game/gameReducer';
import { GAME_STORE_VERSION, MAX_SAVED_ACTIVITY, gameSnapshot, loadGameState, loadProfiles, loadSettings, restoreGameState, saveGameState, saveProfiles, saveSettings } from './persistence';
import { activePlayerKeys, getPlayer, playerCount, updatePlayer } from '../game/playerStore';
import { defaultProfileState, profileReducer, seatsFor } from '../game/profiles';
import { createGameState } from '../game/GameContext';
import { settingDefaults } from '../game/SettingContext';
import { defaultTableRules } from '../../shared';

const startedGame = () => gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });

describe('persistence', () => {
  it('restores active rules independently of pending settings, including the shoe size', () => {
    const tableRules = { ...defaultTableRules, numberOfDecks: '8' as const, dealerSoft17: 'hit' as const };
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame, playerKeys: ['chris', 'dealer'], tableRules,
    });
    saveGameState(state);
    saveSettings({ ...settingDefaults, numberOfDecks: '2', blackjackPayout: '6:5' });
    const restored = loadGameState();
    expect(restored.tableRules).toEqual(tableRules);
    expect(restored.deck.cardKeys.length).toBe(416);
    const refilled = gameReducer({ ...restored, deck: { ...restored.deck, cardKeys: [] } }, { type: GameAction.NewRound });
    expect(refilled.deck.cardKeys.length).toBe(416);
    expect(loadSettings()).toMatchObject({ numberOfDecks: '2', dealerSoft17: 'stand', blackjackPayout: '6:5' });
    const next = gameReducer(restored, { type: GameAction.NewRound, tableRules: loadSettings() });
    expect(next.tableRules).toEqual({ numberOfDecks: '2', dealerSoft17: 'stand', blackjackPayout: '6:5' });
    expect(next.deck.cardKeys.length).toBe(104);
  });

  it('keeps only the newest activity log entries in storage, and takes no more than that from it', () => {
    const entries = (count: number) => Array.from({ length: count }, (_, index) => ({ id: index + 1, timestamp: index, name: 'Chris', description: 'stayed' }));
    const state = { ...startedGame(), activityLog: entries(MAX_SAVED_ACTIVITY + 25) };
    saveGameState(state);
    const saved = JSON.parse(localStorage.getItem(StoreName.GAMESTORE)!).activityLog;
    expect(saved).toHaveLength(MAX_SAVED_ACTIVITY);
    expect(saved.at(-1).id).toBe(MAX_SAVED_ACTIVITY + 25);
    // the live log is left alone
    expect(state.activityLog).toHaveLength(MAX_SAVED_ACTIVITY + 25);

    // a longer log saved by an earlier version is cut down when it is loaded
    const snapshot = gameSnapshot(state);
    const restored = restoreGameState(snapshot);
    expect(restored?.activityLog).toHaveLength(MAX_SAVED_ACTIVITY);
    expect(restored?.activityLog[0].id).toBe(26);
  });

  it('migrates version-4 saves to default rules without losing the hand', () => {
    const state = startedGame();
    state.deck = { ...state.deck, cardKeys: ['Club_7', 'Heart_10', 'Diamond_9', 'Spade_10'] };
    const snapshot = gameSnapshot(gameReducer(state, { type: GameAction.Deal }));
    const { tableRules, ...oldGame } = snapshot.game;
    const restored = restoreGameState({ ...snapshot, game: { ...oldGame, version: 4 } });
    expect(restored?.tableRules).toEqual(defaultTableRules);
    expect(restored?.deck.playerHands).toEqual(snapshot.deck.playerHands);
    expect(restored?.round).toBe(snapshot.game.round);
    expect(restored && gameSnapshot(restored).game.version).toBe(GAME_STORE_VERSION);
  });

  it('round-trips v6 botAccounts, seated awayTask and isReadyToReturn flags, and work activity log entries', () => {
    expect(GAME_STORE_VERSION).toBe(8);
    const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
    const state = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor(profiles),
      botAccounts: {
        ogion: {
          bank: 120,
          balanceHistory: [1000, 0, 120],
          work: { status: 'working', taskId: 'herding-goats', daysWorked: 2 },
          taskOverride: 'herding-goats',
          allowReturn: true,
        },
      },
    });
    const withLog = {
      ...state,
      activityLog: [
        ...state.activityLog,
        {
          id: 99,
          timestamp: 1000,
          name: 'Ogion',
          description: 'left to work: herding goats on gont',
          event: 'work' as const,
        },
      ],
    };

    saveGameState(withLog);
    const restored = loadGameState();

    expect(restored.botAccounts.ogion).toEqual({
      bank: 120,
      balanceHistory: [1000, 0, 120],
      work: { status: 'working', taskId: 'herding-goats', daysWorked: 2 },
      taskOverride: 'herding-goats',
      allowReturn: true,
    });
    expect(getPlayer(restored.playerStore, 'ogion')).toMatchObject({
      bank: 120,
      isSittingOut: true,
      awayTask: 'herding-goats',
      isReadyToReturn: false,
    });
    expect(restored.activityLog.at(-1)).toMatchObject({
      name: 'Ogion',
      description: 'left to work: herding goats on gont',
      event: 'work',
    });
  });

  it('migrates v4 and v5 snapshots without botAccounts by initializing botAccounts from seated bot banks, and rejects invalid botAccounts', () => {
    const profiles = { ...defaultProfileState(), opponentIds: ['ogion'] };
    let state = gameReducer(createGameState(), {
      type: GameAction.NewGame,
      players: seatsFor(profiles),
    });
    state = { ...state, playerStore: updatePlayer(state.playerStore, 'ogion', (p) => ({ ...p, bank: 425 })) };
    const snapshot = gameSnapshot(state);
    const { botAccounts, ...v5Game } = snapshot.game;

    const restoredV5 = restoreGameState({ ...snapshot, game: { ...v5Game, version: 5 } });
    expect(restoredV5?.botAccounts.ogion).toEqual({
      bank: 425,
      balanceHistory: [425],
      allowReturn: false,
    });
    expect(restoredV5?.botAccounts.shevek).toEqual({
      bank: 1000,
      balanceHistory: [1000],
      allowReturn: false,
    });

    const { tableRules, ...v4Game } = v5Game;
    const restoredV4 = restoreGameState({ ...snapshot, game: { ...v4Game, version: 4 } });
    expect(restoredV4?.tableRules).toEqual(defaultTableRules);
    expect(restoredV4?.botAccounts.ogion).toEqual({
      bank: 425,
      balanceHistory: [425],
      allowReturn: false,
    });

    // Reject invalid botAccounts (unknown bot id or negative bank)
    expect(restoreGameState({
      ...snapshot,
      game: {
        ...snapshot.game,
        botAccounts: { chris: { bank: 100, balanceHistory: [100] } },
      },
    })).toBeUndefined();
    expect(restoreGameState({
      ...snapshot,
      game: {
        ...snapshot.game,
        botAccounts: { ogion: { bank: -10, balanceHistory: [100] } },
      },
    })).toBeUndefined();
  });

  it('round-trips profile state including bot work and bank fields and falls back on malformed profile storage', () => {
    let profiles = defaultProfileState();
    profiles = profileReducer(profiles, {
      type: 'syncStats',
      stats: {},
      botAccounts: {
        ogion: {
          bank: 240,
          balanceHistory: [1000, 500, 240],
          work: { status: 'working', taskId: 'minding-ansible', daysWorked: 3 },
          taskOverride: 'minding-ansible',
          allowReturn: true,
        },
      },
    });
    saveProfiles(profiles);

    const loaded = loadProfiles();
    expect(loaded.profiles.find((profile) => profile.id === 'ogion')).toMatchObject({
      bank: 240,
      balanceHistory: [1000, 500, 240],
      work: { status: 'working', taskId: 'minding-ansible', daysWorked: 3 },
      taskOverride: 'minding-ansible',
      allowReturn: true,
    });

    localStorage.setItem(StoreName.PROFILESTORE, '{malformed');
    expect(loadProfiles()).toEqual(defaultProfileState());
  });

  it('rejects invalid active table rules and ignores invalid saved settings', () => {
    const snapshot = gameSnapshot(startedGame());
    expect(restoreGameState({ ...snapshot, game: { ...snapshot.game, tableRules: { numberOfDecks: '100' } } })).toBeUndefined();
    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({
      numberOfDecks: '3', dealerSoft17: true, blackjackPayout: '2:1',
    }));
    expect(loadSettings()).toMatchObject(defaultTableRules);
  });

  it('returns a fresh game when nothing is saved', () => {
    const state = loadGameState();
    expect(state.gameStatus).toBe(GameStatus.Init);
    expect(playerCount(state.playerStore)).toBe(0);
  });

  it('round-trips a game in progress', () => {
    const dealt = gameReducer(startedGame(), { type: GameAction.Deal });
    saveGameState(dealt);

    const restored = loadGameState();
    expect(restored.gameStatus).toBe(dealt.gameStatus);
    expect(restored.pot).toBe(dealt.pot);
    expect(restored.round).toBe(dealt.round);
    expect(restored.controllingPlayer).toBe(dealt.controllingPlayer);
    expect(activePlayerKeys(restored.playerStore)).toEqual(['chris', 'dealer']);
    expect(restored.playerStore.players.chris.bank).toBe(dealt.playerStore.players.chris.bank);
    expect(restored.deck.playerHands.chris.cards).toEqual(dealt.deck.playerHands.chris.cards);
    expect(restored.deck.cardKeys.length).toBe(dealt.deck.cardKeys.length);
    expect(restored.activityLog).toEqual(dealt.activityLog);
  });

  it('restores an open insurance phase and optional insurance/surrender rules', () => {
    let state = gameReducer(startedGame(), {
      type: GameAction.NewGame,
      playerKeys: ['chris', 'dealer'],
      tableRules: { ...defaultTableRules, insurance: true, surrender: true },
    });
    state = gameReducer(state, { type: GameAction.EvaluateGame });
    state.deck = { ...state.deck, cardKeys: ['Spade_9', 'Heart_14', 'Club_10', 'Diamond_9', 'Club_9'] };
    state = gameReducer(state, { type: GameAction.Deal });
    expect(state.isInsuranceOpen).toBe(true);

    saveGameState(state);
    const restored = loadGameState();
    expect(restored.isInsuranceOpen).toBe(true);
    expect(restored.tableRules).toMatchObject({ insurance: true, surrender: true });
  });

  it('round-trips session summary stats and balanceHistory across reloads', () => {
    let state = gameReducer(startedGame(), { type: GameAction.EvaluateGame });
    state.deck = { ...state.deck, cardKeys: ['Spade_9', 'Club_10', 'Heart_7', 'Diamond_10', 'Club_10'] };
    state = gameReducer(state, { type: GameAction.Deal });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
    state = gameReducer(state, { type: GameAction.EvaluateGame });

    saveGameState(state);
    const restored = loadGameState();
    expect(restored.session?.seats.chris).toMatchObject({
      hands: 1,
      wins: 1,
      net: 25,
      balanceHistory: [1000, 1025],
    });
  });

  it('restores the active hand and both card stacks mid-split', () => {
    let state = gameReducer(startedGame(), { type: GameAction.EvaluateGame });
    state.deck = { ...state.deck, cardKeys: ['Spade_9', 'Spade_10', 'Diamond_7', 'Club_10', 'Heart_8', 'Club_8'] };
    state = gameReducer(state, { type: GameAction.Deal });
    state = gameReducer(state, { type: GameAction.Split, playerKey: 'chris' });
    state = gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
    expect(state.activeHandIndex).toBe(1);

    saveGameState(state);
    const restored = loadGameState();

    expect(restored.activeHandIndex).toBe(1);
    expect(restored.controllingPlayer).toBe('chris');
    expect(getPlayerHands(restored.deck, 'chris').map((hand) => hand.cards)).toEqual([
      ['Club_8', 'Spade_10'],
      ['Heart_8', 'Spade_9'],
    ]);
    expect(gameReducer(restored, { type: GameAction.Stay, playerKey: 'chris' }).controllingPlayer).toBe('dealer');
  });

  it('falls back to a fresh game when saved data is malformed', () => {
    saveGameState(startedGame());
    localStorage.setItem(StoreName.DECKSTORE, '{not json');
    expect(playerCount(loadGameState().playerStore)).toBe(0);

    saveGameState(startedGame());
    localStorage.setItem(StoreName.GAMESTORE, JSON.stringify({ version: 0 }));
    expect(playerCount(loadGameState().playerStore)).toBe(0);
  });

  it('restores a game from its snapshot and refuses an incomplete one', () => {
    const dealt = gameReducer(startedGame(), { type: GameAction.Deal });
    const snapshot = gameSnapshot(dealt);
    expect(snapshot.game.version).toBe(GAME_STORE_VERSION);

    const restored = restoreGameState(JSON.parse(JSON.stringify(snapshot)));
    expect(restored?.gameStatus).toBe(dealt.gameStatus);
    expect(restored?.playerStore.players.chris.bank).toBe(dealt.playerStore.players.chris.bank);
    expect(restored?.deck.playerHands.chris.cards).toEqual(dealt.deck.playerHands.chris.cards);
    expect(restored?.isSpinnerVisible).toBe(false);
    expect(restored && gameSnapshot(restored)).toEqual(snapshot);

    expect(restoreGameState(undefined)).toBeUndefined();
    expect(restoreGameState({ ...snapshot, deck: { cardKeys: [] } })).toBeUndefined();
    expect(restoreGameState({ ...snapshot, game: { ...snapshot.game, version: 0 } })).toBeUndefined();
  });

  it('bounds the activity log in a snapshot when asked', () => {
    const state = { ...startedGame(), activityLog: Array.from({ length: 12 }, (_, id) => ({ id, timestamp: id, name: 'x', description: 'y' })) };
    expect(gameSnapshot(state).game.activityLog).toHaveLength(12);
    const bounded = gameSnapshot(state, { maxActivity: 5 }).game.activityLog;
    expect(bounded.map((entry) => entry.id)).toEqual([7, 8, 9, 10, 11]);
  });

  it('merges saved settings over defaults and always starts with the options panel closed', () => {
    saveSettings({ ...settingDefaults, isActivityLogVisible: true, isOptionsPanelVisible: true });
    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({ isActivityLogVisible: true, bogus: 'x', isSplashScreenVisible: false }));

    const loaded = loadSettings();
    expect(loaded.isActivityLogVisible).toBe(true);
    expect(loaded.isOptionsPanelVisible).toBe(false);
    expect(loaded).not.toHaveProperty('bogus');
    expect(loaded).not.toHaveProperty('isSplashScreenVisible');
  });

  it('round-trips appearance settings and drops values a setting does not accept', () => {
    saveSettings({ ...settingDefaults, themeMode: 'dark', accent: 'crimson', cardBackPattern: 'stripes' });
    expect(loadSettings()).toMatchObject({ themeMode: 'dark', accent: 'crimson', cardBackPattern: 'stripes' });

    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({
      themeMode: 'sepia', accent: true, cardStyle: 'bold', isHandValueVisible: 'yes',
    }));
    const loaded = loadSettings();
    expect(loaded.themeMode).toBe(settingDefaults.themeMode);
    expect(loaded.accent).toBe(settingDefaults.accent);
    expect(loaded.cardStyle).toBe('bold');
    expect(loaded.isHandValueVisible).toBe(false);
  });

  it('round-trips the queue side and falls back to the left for a value it does not accept', () => {
    saveSettings({ ...settingDefaults, queueSide: 'right' });
    expect(loadSettings().queueSide).toBe('right');

    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({ queueSide: 'top' }));
    expect(loadSettings().queueSide).toBe('left');
  });

  it('fills in appearance and notification defaults for a settings store saved before they existed', () => {
    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({ isActivityLogVisible: true }));
    const loaded = loadSettings();
    expect(loaded.isActivityLogVisible).toBe(true);
    expect(loaded).toMatchObject({
      themeMode: 'dark',
      accent: 'blue',
      cardStyle: 'classic',
      cardBackPattern: 'rings',
      cardBackColor: 'brand',
      isGameplayToastsEnabled: true,
      isPotToastsEnabled: true,
    });
  });
});
