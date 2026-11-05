import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { createGameState } from "../context/GameContext";
import { settingDefaults } from "../context/SettingContext";
import { StoreName } from "../enums";
import { IPlayerStoreState } from "../interfaces";
import { DeckState, GameState, ProfileState, SettingsState } from "../types";
import { defaultProfileState, normalizeProfileState } from "./profiles";

/** Bump when the shape of the saved game snapshot changes. */
const GAME_STORE_VERSION = 2;

/** Scalar game fields saved alongside the deck and player stores. */
type SavedGame = Pick<GameState,
  'activityLog' | 'controllingPlayer' | 'dealerHasControl' | 'gameStatus' | 'gameStatusFlag' |
  'loser' | 'minimumBet' | 'pot' | 'round' | 'turnCount' | 'winner'
> & { version: number };

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
    && typeof value.pot === 'number'
    && typeof value.round === 'number'
    && Array.isArray(value.activityLog);
}

/**
 * Build the initial game state, restoring a saved game when a complete,
 * valid snapshot exists. Falls back to a fresh game otherwise.
 */
export function loadGameState(): GameState {
  const fresh = createGameState();
  const deck = readJson<unknown>(StoreName.DECKSTORE);
  const players = readJson<unknown>(StoreName.PLAYERSTORE);
  const game = readJson<unknown>(StoreName.GAMESTORE);

  if (!isDeckState(deck) || !isPlayerState(players) || !isSavedGame(game)) return fresh;

  try {
    const { version, ...saved } = game;
    return {
      ...fresh,
      ...saved,
      deck: new PlayingCardDeck(deck),
      playerStore: new PlayerStore(players),
    };
  } catch {
    return fresh;
  }
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

/**
 * Build the initial settings, merging saved values over the defaults.
 */
export function loadSettings(): SettingsState {
  const saved = readJson<unknown>(StoreName.SETTINGSTORE);
  const settings: SettingsState = { ...settingDefaults };
  if (isObject(saved)) {
    for (const key of Object.keys(settingDefaults)) {
      if (typeof saved[key] === 'boolean') settings[key] = saved[key] as boolean;
    }
  }
  settings.isOptionsPanelVisible = false;
  return settings;
}

export function saveSettings(settings: SettingsState): void {
  writeJson(StoreName.SETTINGSTORE, settings);
}

export function saveGameState(state: GameState): void {
  const snapshot: SavedGame = {
    version: GAME_STORE_VERSION,
    activityLog: state.activityLog,
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
  };
  writeJson(StoreName.DECKSTORE, state.deck.state);
  writeJson(StoreName.PLAYERSTORE, state.playerStore.state);
  writeJson(StoreName.GAMESTORE, snapshot);
}
