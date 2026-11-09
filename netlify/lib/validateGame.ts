import type { IPlayerStoreState } from '../../src/interfaces';
import type { ActivityLogEntry, DeckState, PlayerHand, SavedGame, SavedGameSnapshot } from '../../src/types';
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

const MAX_SPLIT_HANDS = 4;

function isHandValue(value: unknown): boolean {
  return isObject(value) && isFiniteNumber(value.aceAsEleven) && isFiniteNumber(value.aceAsOne) && isFiniteNumber(value.highest);
}

/** A hand: its cards and value, plus the optional stake, result and flags of a split hand */
function isHand(value: unknown, depth = 0): value is PlayerHand {
  return isObject(value)
    && isCardKeys(value.cards)
    && isHandValue(value.handValue)
    && (value.splitHands === undefined || (
      depth === 0 && Array.isArray(value.splitHands) && value.splitHands.length <= MAX_SPLIT_HANDS
      && value.splitHands.every((hand) => isHand(hand, depth + 1))
    ))
    && (value.stake === undefined || isFiniteNumber(value.stake))
    && (value.net === undefined || isFiniteNumber(value.net))
    && (value.result === undefined || typeof value.result === 'string')
    && ['isBusted', 'isStaying', 'isBlackjack', 'isSplit', 'isSplitAces'].every((flag) => value[flag] === undefined || typeof value[flag] === 'boolean');
}

function isDeckState(value: unknown): value is DeckState {
  return isObject(value)
    && isCardKeys(value.cardKeys)
    && isCardKeys(value.drawnKeys)
    && isCardKeys(value.selectedKeys)
    && isObject(value.playerHands)
    && Object.values(value.playerHands).length <= MAX_SEATS
    && Object.values(value.playerHands).every((hand) => isHand(hand));
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
    && isFiniteNumber(value.activeHandIndex)
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
const copyHand = (hand: PlayerHand): PlayerHand => ({
  ...hand,
  cards: [...hand.cards],
  handValue: { ...hand.handValue },
  ...(hand.splitHands === undefined ? {} : { splitHands: hand.splitHands.map(copyHand) }),
});

function pickGameSnapshot({ deck, players, game }: SavedGameSnapshot): SavedGameSnapshot {
  const optional = <T>(value: T | undefined, key: string): Record<string, T> => (value === undefined ? {} : { [key]: value });
  return {
    deck: {
      cardKeys: [...deck.cardKeys],
      drawnKeys: [...deck.drawnKeys],
      selectedKeys: [...deck.selectedKeys],
      playerHands: Object.fromEntries(Object.entries(deck.playerHands).map(([key, hand]) => [key, copyHand(hand)])),
    },
    players: {
      players: Object.fromEntries(Object.entries(players.players).map(([key, player]) => [key, { ...player }])),
      lastWriteTime: players.lastWriteTime,
      ...optional(players.activePlayerKeys, 'activePlayerKeys'),
      ...optional(players.currentPlayerKey, 'currentPlayerKey'),
    },
    game: {
      version: game.version,
      activeHandIndex: game.activeHandIndex,
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
