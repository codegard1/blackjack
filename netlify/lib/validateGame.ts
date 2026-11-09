import type { IPlayerStoreState } from '../../src/interfaces';
import type { ActivityLogEntry, DeckState, SavedGame, SavedGameSnapshot } from '../../src/types';
import { isFiniteNumber, isObject, isStringArray, isText, parseJsonBody } from './validate';

/**
 * The largest request body a game PUT accepts. A snapshot is a few kilobytes plus
 * the activity log, which the client trims before sending.
 */
export const GAME_MAX_BODY_BYTES = 256 * 1024;
const MAX_CARDS = 1000;
const MAX_SEATS = 10;
const MAX_ACTIVITY = 1000;

const isCardKeys = (value: unknown): value is string[] => isStringArray(value, MAX_CARDS);

function isHandValue(value: unknown): boolean {
  return isObject(value) && isFiniteNumber(value.aceAsEleven) && isFiniteNumber(value.aceAsOne) && isFiniteNumber(value.highest);
}

function isDeckState(value: unknown): value is DeckState {
  return isObject(value)
    && isCardKeys(value.cardKeys)
    && isCardKeys(value.drawnKeys)
    && isCardKeys(value.selectedKeys)
    && isObject(value.playerHands)
    && Object.values(value.playerHands).length <= MAX_SEATS
    && Object.values(value.playerHands).every((hand) => isObject(hand) && isCardKeys(hand.cards) && isHandValue(hand.handValue));
}

function isPlayersState(value: unknown): value is IPlayerStoreState {
  if (!isObject(value) || !isObject(value.players) || typeof value.lastWriteTime !== 'string') return false;
  const seats = Object.entries(value.players);
  return seats.length <= MAX_SEATS
    && seats.every(([key, player]) => isObject(player) && player.key === key && isText(player.title, 40) && isFiniteNumber(player.bank))
    && (value.activePlayerKeys === undefined || isStringArray(value.activePlayerKeys, MAX_SEATS))
    && (value.currentPlayerKey === undefined || typeof value.currentPlayerKey === 'string');
}

function isActivityEntry(value: unknown): value is ActivityLogEntry {
  return isObject(value)
    && isFiniteNumber(value.id)
    && isFiniteNumber(value.timestamp)
    && typeof value.name === 'string'
    && typeof value.description === 'string';
}

const isOptionalKey = (value: unknown): boolean => value === undefined || typeof value === 'string';

function isSavedGame(value: unknown): value is SavedGame {
  return isObject(value)
    && isFiniteNumber(value.version)
    && Array.isArray(value.activityLog)
    && value.activityLog.length <= MAX_ACTIVITY
    && value.activityLog.every(isActivityEntry)
    && isOptionalKey(value.controllingPlayer)
    && isOptionalKey(value.loser)
    && isOptionalKey(value.winner)
    && typeof value.dealerHasControl === 'boolean'
    && typeof value.gameStatusFlag === 'boolean'
    && isFiniteNumber(value.gameStatus)
    && isFiniteNumber(value.minimumBet)
    && isFiniteNumber(value.pot)
    && isFiniteNumber(value.round)
    && isFiniteNumber(value.turnCount);
}

export function isGameSnapshot(value: unknown): value is SavedGameSnapshot {
  return isObject(value) && isDeckState(value.deck) && isPlayersState(value.players) && isSavedGame(value.game);
}

/** Keep only the fields the document stores, so unknown keys never reach the database */
function pickGameSnapshot({ deck, players, game }: SavedGameSnapshot): SavedGameSnapshot {
  const optional = <T>(value: T | undefined, key: string): Record<string, T> => (value === undefined ? {} : { [key]: value });
  return {
    deck: {
      cardKeys: [...deck.cardKeys],
      drawnKeys: [...deck.drawnKeys],
      selectedKeys: [...deck.selectedKeys],
      playerHands: Object.fromEntries(Object.entries(deck.playerHands).map(([key, hand]) => [key, { cards: [...hand.cards], handValue: { ...hand.handValue } }])),
    },
    players: {
      players: Object.fromEntries(Object.entries(players.players).map(([key, player]) => [key, { ...player }])),
      lastWriteTime: players.lastWriteTime,
      ...optional(players.activePlayerKeys, 'activePlayerKeys'),
      ...optional(players.currentPlayerKey, 'currentPlayerKey'),
    },
    game: {
      version: game.version,
      activityLog: game.activityLog.map((entry) => ({ ...entry })),
      dealerHasControl: game.dealerHasControl,
      gameStatus: game.gameStatus,
      gameStatusFlag: game.gameStatusFlag,
      minimumBet: game.minimumBet,
      pot: game.pot,
      round: game.round,
      turnCount: game.turnCount,
      ...optional(game.controllingPlayer, 'controllingPlayer'),
      ...optional(game.loser, 'loser'),
      ...optional(game.winner, 'winner'),
    },
  };
}

/**
 * Parse the body of a game PUT: JSON of the form `{ game: GameSnapshot }`.
 * Returns the cleaned snapshot, or the reason the body was rejected.
 */
export function parseGameBody(text: string): { data: SavedGameSnapshot } | { error: string } {
  if (text.length > GAME_MAX_BODY_BYTES) return { error: 'Body too large.' };
  const parsed = parseJsonBody(text);
  if ('error' in parsed) return parsed;
  if (!isGameSnapshot(parsed.body.game)) return { error: 'Body must be { game: GameSnapshot }.' };
  return { data: pickGameSnapshot(parsed.body.game) };
}
