import { describe, expect, it } from 'vitest';
import { GameAction, GameStatus, StoreName } from '../enums';
import { gameReducer } from './gameReducer';
import { GAME_STORE_VERSION, gameSnapshot, loadGameState, loadSettings, restoreGameState, saveGameState, saveSettings } from './persistence';
import { createGameState, settingDefaults } from '../context';

const startedGame = () => gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });

describe('persistence', () => {
  it('returns a fresh game when nothing is saved', () => {
    const state = loadGameState();
    expect(state.gameStatus).toBe(GameStatus.Init);
    expect(state.playerStore.length).toBe(0);
  });

  it('round-trips a game in progress', () => {
    const dealt = gameReducer(startedGame(), { type: GameAction.Deal });
    saveGameState(dealt);

    const restored = loadGameState();
    expect(restored.gameStatus).toBe(dealt.gameStatus);
    expect(restored.pot).toBe(dealt.pot);
    expect(restored.round).toBe(dealt.round);
    expect(restored.controllingPlayer).toBe(dealt.controllingPlayer);
    expect(restored.playerStore.activePlayerKeys).toEqual(['chris', 'dealer']);
    expect(restored.playerStore.player('chris').bank).toBe(dealt.playerStore.player('chris').bank);
    expect(restored.deck.playerHands.chris.cards).toEqual(dealt.deck.playerHands.chris.cards);
    expect(restored.deck.length).toBe(dealt.deck.length);
    expect(restored.activityLog).toEqual(dealt.activityLog);
  });

  it('falls back to a fresh game when saved data is malformed', () => {
    saveGameState(startedGame());
    localStorage.setItem(StoreName.DECKSTORE, '{not json');
    expect(loadGameState().playerStore.length).toBe(0);

    saveGameState(startedGame());
    localStorage.setItem(StoreName.GAMESTORE, JSON.stringify({ version: 0 }));
    expect(loadGameState().playerStore.length).toBe(0);
  });

  it('restores a game from its snapshot and refuses an incomplete one', () => {
    const dealt = gameReducer(startedGame(), { type: GameAction.Deal });
    const snapshot = gameSnapshot(dealt);
    expect(snapshot.game.version).toBe(GAME_STORE_VERSION);

    const restored = restoreGameState(JSON.parse(JSON.stringify(snapshot)));
    expect(restored?.gameStatus).toBe(dealt.gameStatus);
    expect(restored?.playerStore.player('chris').bank).toBe(dealt.playerStore.player('chris').bank);
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
      themeMode: 'sepia', accent: true, cardStyle: 'bold', isDeckVisible: 'yes',
    }));
    const loaded = loadSettings();
    expect(loaded.themeMode).toBe(settingDefaults.themeMode);
    expect(loaded.accent).toBe(settingDefaults.accent);
    expect(loaded.cardStyle).toBe('bold');
    expect(loaded.isDeckVisible).toBe(false);
  });

  it('fills in appearance defaults for a settings store saved before they existed', () => {
    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({ isActivityLogVisible: true }));
    const loaded = loadSettings();
    expect(loaded.isActivityLogVisible).toBe(true);
    expect(loaded).toMatchObject({
      themeMode: 'light', accent: 'blue', cardStyle: 'classic', cardBackPattern: 'rings', cardBackColor: 'brand',
    });
  });
});
