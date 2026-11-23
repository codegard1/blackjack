import { isBotId } from "../characters";
import { createGameState } from "../context/GameContext";
import { settingDefaults } from "../context/SettingContext";
import { StoreName } from "../enums";
import { IPlayerStoreState } from "../interfaces";
import {
  DeckState,
  GameState,
  ProfileState,
  SavedGame,
  SavedGameSnapshot,
  SettingKey,
  SettingsState,
  cloneBotAccounts,
  defaultTableRules,
  isBotAccountState,
  isTableRules,
  isValidSettingValue,
  tableRulesFrom,
} from "../types";
import { restoreDeckState } from "./deck";
import { allPlayers, createPlayerStore, playerStoreSnapshot } from "./playerStore";
import { defaultProfileState, normalizeProfileState } from "./profiles";
import { cloneSessionSummary, isSessionSummary } from "./session";
import { defaultBotAccount, defaultBotAccounts } from "./work";

/** Bump when the shape of the saved game snapshot changes. */
export const GAME_STORE_VERSION = 8;

/** How many of the newest activity log entries a snapshot sent to the server keeps */
export const MAX_SYNCED_ACTIVITY = 200;

/**
 * How many of the newest activity log entries are kept in the browser's storage, and
 * taken from it. The log is saved after every action, so without a limit each save
 * gets slower and the storage fills. The live log is not trimmed while the page is
 * open: the notices are worked out from what was added to it since the last change.
 */
export const MAX_SAVED_ACTIVITY = 1000;

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

function isSavedBotAccounts(value: unknown): boolean {
  return value === undefined || (
    isObject(value) && Object.entries(value).every(([id, account]) => isBotId(id) && isBotAccountState(account))
  );
}

function isSavedGame(value: unknown): value is SavedGame {
  return isObject(value)
    && (value.version === GAME_STORE_VERSION || value.version === 7 || value.version === 6 || value.version === 5 || value.version === 4)
    && (value.version === 4 || isTableRules(value.tableRules))
    && isSavedBotAccounts(value.botAccounts)
    && (value.session === undefined || isSessionSummary(value.session))
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
    deck: state.deck,
    players: playerStoreSnapshot(state.playerStore),
    game: {
      version: GAME_STORE_VERSION,
      activityLog,
      activeHandIndex: state.activeHandIndex,
      botAccounts: cloneBotAccounts(state.botAccounts),
      controllingPlayer: state.controllingPlayer,
      dealerHasControl: state.dealerHasControl,
      ...(state.isInsuranceOpen ? { isInsuranceOpen: true } : {}),
      gameStatus: state.gameStatus,
      gameStatusFlag: state.gameStatusFlag,
      loser: state.loser,
      minimumBet: state.minimumBet,
      pot: state.pot,
      round: state.round,
      ...(state.session ? { session: cloneSessionSummary(state.session) } : {}),
      tableRules: tableRulesFrom(state.tableRules),
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
    const { version, botAccounts: savedAccounts, ...saved } = game;
    const tableRules = version === 4 ? { ...defaultTableRules } : tableRulesFrom(saved.tableRules);
    const playerStore = createPlayerStore(players);
    const botAccounts = { ...defaultBotAccounts(), ...cloneBotAccounts(savedAccounts) };
    // For snapshots saved before botAccounts existed, keep each seated bot's bank in step
    allPlayers(playerStore).forEach((player) => {
      if (isBotId(player.key) && !savedAccounts?.[player.key]) {
        botAccounts[player.key] = defaultBotAccount(player.bank);
      }
    });
    return {
      ...createGameState(),
      ...saved,
      activityLog: saved.activityLog.slice(-MAX_SAVED_ACTIVITY),
      botAccounts,
      tableRules,
      deck: restoreDeckState(deck),
      playerStore,
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

export { isValidSettingValue };

/**
 * Normalize a remote settings object over the defaults. Returns undefined when the
 * value is not an object, has no known settings, or has an invalid value for any
 * known setting. Preserves the local drawer visibility so syncing never pops open
 * or slams shut the Options panel.
 */
export function normalizeSettings(value: unknown, current?: SettingsState): SettingsState | undefined {
  if (!isObject(value)) return undefined;
  const keys = Object.keys(settingDefaults) as SettingKey[];
  let hasKnownKey = false;
  const settings: Record<string, unknown> = { ...settingDefaults };
  for (const key of keys) {
    if (!(key in value) || value[key] === undefined) continue;
    if (!isValidSettingValue(key, value[key])) return undefined;
    hasKnownKey = true;
    settings[key] = value[key];
  }
  if (!hasKnownKey) return undefined;
  settings.isOptionsPanelVisible = current?.isOptionsPanelVisible ?? false;
  return settings as SettingsState;
}

/** The form of settings sent to the server: excludes transient drawer visibility */
export function toRemoteSettings(settings: SettingsState): Omit<SettingsState, 'isOptionsPanelVisible'> {
  const { isOptionsPanelVisible: _, ...remote } = settings;
  return remote;
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
  const { deck, players, game } = gameSnapshot(state, { maxActivity: MAX_SAVED_ACTIVITY });
  writeJson(StoreName.DECKSTORE, deck);
  writeJson(StoreName.PLAYERSTORE, players);
  writeJson(StoreName.GAMESTORE, game);
}
