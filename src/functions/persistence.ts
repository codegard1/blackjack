import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { createGameState } from "../context/GameContext";
import { settingDefaults } from "../context/SettingContext";
import { StoreName } from "../enums";
import { IPlayerStoreState } from "../interfaces";
import { DeckState, GameState, ProfileState, SavedGame, SavedGameSnapshot, SettingKey, SettingsState, settingOptions } from "../types";
import { defaultProfileState, normalizeProfileState } from "./profiles";

/** Bump when the shape of the saved game snapshot changes. */
export const GAME_STORE_VERSION = 4;

/** How many of the newest activity log entries a snapshot sent to the server keeps */
export const MAX_SYNCED_ACTIVITY = 200;

function readJson<T>(key: StoreName): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: StoreName, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable; persistence is best-effort.
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isDeckState(value: unknown): value is DeckState {
  return isObject(value)
    && Array.isArray(value.cardKeys)
    && Array.isArray(value.drawnKeys)
    && Array.isArray(value.selectedKeys)
    && isObject(value.playerHands);
}

function isPlayerState(value: unknown): value is IPlayerStoreState {
  return isObject(value) && isObject(value.players);
}

function isSavedGame(value: unknown): value is SavedGame {
  return isObject(value)
    && value.version === GAME_STORE_VERSION
    && typeof value.gameStatus === 'number'
    && typeof value.activeHandIndex === 'number'
    && typeof value.pot === 'number'
    && typeof value.round === 'number'
    && Array.isArray(value.activityLog);
}

/**
 * The saved form of a game. With `maxActivity` only that many of the newest activity
 * log entries are kept, which bounds what is sent to the server.
 */
export function gameSnapshot(state: GameState, { maxActivity }: { maxActivity?: number } = {}): SavedGameSnapshot {
  const activityLog = maxActivity !== undefined && state.activityLog.length > maxActivity
    ? state.activityLog.slice(-maxActivity)
    : state.activityLog;
  return {
    deck: state.deck.state,
    players: state.playerStore.state,
    game: {
      version: GAME_STORE_VERSION,
      activityLog,
      activeHandIndex: state.activeHandIndex,
      controllingPlayer: state.controllingPlayer,
      dealerHasControl: state.dealerHasControl,
      gameStatus: state.gameStatus,
      gameStatusFlag: state.gameStatusFlag,
      loser: state.loser,
      minimumBet: state.minimumBet,
      pot: state.pot,
      round: state.round,
      turnCount: state.turnCount,
      winner: state.winner,
    },
  };
}

/**
 * Rebuild a game from a snapshot, or return undefined when it is not a complete,
 * valid one. Transient fields (spinner, message bar) start fresh.
 */
export function restoreGameState(snapshot: unknown): GameState | undefined {
  if (!isObject(snapshot)) return undefined;
  const { deck, players, game } = snapshot;
  if (!isDeckState(deck) || !isPlayerState(players) || !isSavedGame(game)) return undefined;

  try {
    const { version, ...saved } = game;
    return {
      ...createGameState(),
      ...saved,
      deck: new PlayingCardDeck(deck),
      playerStore: new PlayerStore(players),
    };
  } catch {
    return undefined;
  }
}

/**
 * Build the initial game state, restoring a saved game when a complete,
 * valid snapshot exists. Falls back to a fresh game otherwise.
 */
export function loadGameState(): GameState {
  return restoreGameState({
    deck: readJson<unknown>(StoreName.DECKSTORE),
    players: readJson<unknown>(StoreName.PLAYERSTORE),
    game: readJson<unknown>(StoreName.GAMESTORE),
  }) ?? createGameState();
}

function isProfile(value: unknown): boolean {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.createdAt === 'number'
    && isObject(value.stats);
}

function isProfileState(value: unknown): value is ProfileState {
  return isObject(value)
    && Array.isArray(value.profiles)
    && value.profiles.every(isProfile)
    && typeof value.selectedId === 'string';
}

/**
 * Build the player profiles, restoring the saved ones when they are valid
 * and falling back to the defaults otherwise.
 */
export function loadProfiles(): ProfileState {
  const saved = readJson<unknown>(StoreName.PROFILESTORE);
  return isProfileState(saved) ? normalizeProfileState(saved) : defaultProfileState();
}

export function saveProfiles(state: ProfileState): void {
  writeJson(StoreName.PROFILESTORE, state);
}

const isEnumeratedSetting = (key: SettingKey): key is keyof typeof settingOptions => key in settingOptions;

/** Whether `value` is one the setting `key` accepts: a boolean, or one of its listed options */
export function isValidSettingValue(key: SettingKey, value: unknown): boolean {
  if (isEnumeratedSetting(key)) {
    return typeof value === 'string' && (settingOptions[key] as readonly string[]).includes(value);
  }
  return typeof value === 'boolean';
}

/**
 * Build the initial settings, merging valid saved values over the defaults.
 * Unknown keys and values a setting does not accept are dropped.
 */
export function loadSettings(): SettingsState {
  const saved = readJson<unknown>(StoreName.SETTINGSTORE);
  const settings: Record<string, unknown> = { ...settingDefaults };
  if (isObject(saved)) {
    for (const key of Object.keys(settingDefaults) as SettingKey[]) {
      if (isValidSettingValue(key, saved[key])) settings[key] = saved[key];
    }
  }
  settings.isOptionsPanelVisible = false;
  return settings as SettingsState;
}

export function saveSettings(settings: SettingsState): void {
  writeJson(StoreName.SETTINGSTORE, settings);
}

export function saveGameState(state: GameState): void {
  const { deck, players, game } = gameSnapshot(state);
  writeJson(StoreName.DECKSTORE, deck);
  writeJson(StoreName.PLAYERSTORE, players);
  writeJson(StoreName.GAMESTORE, game);
}
