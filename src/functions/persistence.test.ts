import { describe, expect, it } from 'vitest';
import { GameAction, GameStatus, StoreName } from '../enums';
import { gameReducer } from './gameReducer';
import { loadGameState, loadSettings, saveGameState, saveSettings } from './persistence';
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

  it('merges saved settings over defaults and always starts with the options panel closed', () => {
    saveSettings({ ...settingDefaults, isActivityLogVisible: true, isOptionsPanelVisible: true });
    localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify({ isActivityLogVisible: true, bogus: 'x', isSplashScreenVisible: false }));

    const loaded = loadSettings();
    expect(loaded.isActivityLogVisible).toBe(true);
    expect(loaded.isOptionsPanelVisible).toBe(false);
    expect(loaded).not.toHaveProperty('bogus');
    expect(loaded).not.toHaveProperty('isSplashScreenVisible');
  });
});
