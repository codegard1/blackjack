import type { IPlayer, IPlayerStoreState } from '../../src/interfaces';
import type { ActivityLogEntry, DeckState, PlayerHand, SavedGame, SavedGameSnapshot } from '../../src/types';
import { isTableRules, tableRulesFrom } from '../../src/types/TableRules';
import { isFiniteNumber, isObject, isStats, parseJsonBody } from './validate';

/**
 * The largest request body a game PUT accepts. A long game with the activity log
 * the client sends (its newest 200 entries) is about 27 KB.
 */
export const GAME_MAX_BODY_BYTES = 64 * 1024;
const MAX_CARDS = 1000;
const MAX_SEATS = 10;
const MAX_ACTIVITY = 250;
const MAX_SPLIT_HANDS = 4;

/** A card key such as Spade_7 or Heart_Five_5 */
const CARD_KEY = /^[A-Za-z]{1,12}_[A-Za-z0-9]{1,12}(?:_\d{1,3})?$/;
const ROUND_RESULTS = ['blackjack', 'win', 'push', 'loss'];
const PLAYER_ROLES = ['human', 'bot', 'dealer'];
const ACTIVITY_EVENTS = ['game', 'round', 'deal', 'draw', 'ante', 'bet', 'double', 'split', 'stay', 'win', 'loss', 'push', 'shuffle'];

const isCardKeys = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= MAX_CARDS && value.every((key) => typeof key === 'string' && CARD_KEY.test(key));
const optional = (value: unknown, check: (value: unknown) => boolean): boolean => value === undefined || check(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isOneOf = (options: string[]) => (value: unknown): boolean => typeof value === 'string' && options.includes(value);
const isShortText = (max: number) => (value: unknown): value is string => typeof value === 'string' && value.length <= max;
const isSmallInteger = (max: number) => (value: unknown): boolean => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

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
    && optional(value.stake, isFiniteNumber)
    && optional(value.net, isFiniteNumber)
    && optional(value.result, isOneOf(ROUND_RESULTS))
    && ['isBusted', 'isStaying', 'isBlackjack', 'isSplit', 'isSplitAces'].every((flag) => optional(value[flag], isBoolean));
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

/** A seat at the table: the fields of IPlayer, each checked by type */
function isPlayer(value: unknown, key: string): value is IPlayer {
  return isObject(value)
    && value.key === key
    && isShortText(40)(value.title) && value.title !== ''
    && isBoolean(value.isNPC)
    && isFiniteNumber(value.id)
    && isFiniteNumber(value.bank)
    && isStats(value.stats)
    && optional(value.role, isOneOf(PLAYER_ROLES))
    && optional(value.result, isOneOf(ROUND_RESULTS))
    && optional(value.lastAction, isSmallInteger(16))
    && optional(value.status, isSmallInteger(16))
    && ['lastAnte', 'lastBet', 'lossStreak', 'net', 'totalBet'].every((field) => optional(value[field], isFiniteNumber))
    && ['disabled', 'isFinished', 'isSelected', 'isBusted', 'isBlackjack', 'isStaying', 'isSittingOut', 'turn'].every((flag) => optional(value[flag], isBoolean));
}

function isPlayersState(value: unknown): value is IPlayerStoreState {
  if (!isObject(value) || !isObject(value.players) || !isShortText(40)(value.lastWriteTime)) return false;
  const seats = Object.entries(value.players);
  return seats.length <= MAX_SEATS
    && seats.every(([key, player]) => isPlayer(player, key))
    && optional(value.activePlayerKeys, (keys) => Array.isArray(keys) && keys.length <= MAX_SEATS && keys.every(isShortText(64)))
    && optional(value.currentPlayerKey, isShortText(64));
}

function isActivityEntry(value: unknown): value is ActivityLogEntry {
  return isObject(value)
    && isFiniteNumber(value.id)
    && isFiniteNumber(value.timestamp)
    && isShortText(40)(value.name)
    && isShortText(200)(value.description)
    && optional(value.sessionId, isFiniteNumber)
    && optional(value.round, isFiniteNumber)
    && optional(value.event, isOneOf(ACTIVITY_EVENTS))
    && optional(value.amount, isFiniteNumber);
}

function isSavedGame(value: unknown): value is SavedGame {
  return isObject(value)
    && isFiniteNumber(value.version)
    && ((value.version < 5 && value.tableRules === undefined) || isTableRules(value.tableRules))
    && isFiniteNumber(value.activeHandIndex)
    && Array.isArray(value.activityLog)
    && value.activityLog.length <= MAX_ACTIVITY
    && value.activityLog.every(isActivityEntry)
    && optional(value.controllingPlayer, isShortText(64))
    && optional(value.loser, isShortText(64))
    && optional(value.winner, isShortText(64))
    && isBoolean(value.dealerHasControl)
    && isBoolean(value.gameStatusFlag)
    && isFiniteNumber(value.gameStatus)
    && isFiniteNumber(value.minimumBet)
    && isFiniteNumber(value.pot)
    && isFiniteNumber(value.round)
    && isFiniteNumber(value.turnCount);
}

export function isGameSnapshot(value: unknown): value is SavedGameSnapshot {
  return isObject(value) && isDeckState(value.deck) && isPlayersState(value.players) && isSavedGame(value.game);
}

/** A copy holding only the named fields that are present */
function pick<T extends object>(source: T, fields: (keyof T)[]): T {
  const copy: Partial<T> = {};
  for (const field of fields) if (source[field] !== undefined) copy[field] = source[field];
  return copy as T;
}

const HAND_FIELDS: (keyof PlayerHand)[] = ['cards', 'handValue', 'stake', 'net', 'result', 'isBusted', 'isStaying', 'isBlackjack', 'isSplit', 'isSplitAces'];
const PLAYER_FIELDS: (keyof IPlayer)[] = [
  'key', 'title', 'isNPC', 'id', 'bank', 'disabled', 'role', 'stats', 'isFinished', 'isSelected', 'isBusted', 'isBlackjack',
  'isStaying', 'isSittingOut', 'lastAction', 'lastAnte', 'lastBet', 'lossStreak', 'net', 'result', 'status', 'totalBet', 'turn',
];
const ENTRY_FIELDS: (keyof ActivityLogEntry)[] = ['id', 'sessionId', 'round', 'event', 'timestamp', 'name', 'description', 'amount'];
const GAME_FIELDS: (keyof SavedGame)[] = [
  'version', 'activityLog', 'activeHandIndex', 'controllingPlayer', 'dealerHasControl', 'gameStatus', 'gameStatusFlag',
  'loser', 'minimumBet', 'pot', 'round', 'turnCount', 'winner',
];

const copyHand = (hand: PlayerHand): PlayerHand => ({
  ...pick(hand, HAND_FIELDS),
  cards: [...hand.cards],
  handValue: { aceAsEleven: hand.handValue.aceAsEleven, aceAsOne: hand.handValue.aceAsOne, highest: hand.handValue.highest },
  ...(hand.splitHands === undefined ? {} : { splitHands: hand.splitHands.map(copyHand) }),
});

/** Keep only the fields the game defines, so unknown keys never reach the database */
function pickGameSnapshot({ deck, players, game }: SavedGameSnapshot): SavedGameSnapshot {
  return {
    deck: {
      cardKeys: [...deck.cardKeys],
      drawnKeys: [...deck.drawnKeys],
      selectedKeys: [...deck.selectedKeys],
      playerHands: Object.fromEntries(Object.entries(deck.playerHands).map(([key, hand]) => [key, copyHand(hand)])),
    },
    players: {
      ...pick(players, ['activePlayerKeys', 'currentPlayerKey', 'lastWriteTime']),
      players: Object.fromEntries(Object.entries(players.players).map(([key, player]) => [key, { ...pick(player, PLAYER_FIELDS), stats: { ...player.stats } }])),
    },
    game: {
      ...pick(game, GAME_FIELDS),
      ...(game.tableRules === undefined ? {} : { tableRules: tableRulesFrom(game.tableRules) }),
      activityLog: game.activityLog.map((entry) => pick(entry, ENTRY_FIELDS)),
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
