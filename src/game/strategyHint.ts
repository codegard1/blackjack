import { PlayingCardKey, TableRules } from "../../shared";
import { handValue } from "./getHandValue";

/** A move a seat can make on its turn */
export type BotMove = 'hit' | 'stay' | 'double' | 'split' | 'surrender';

/** Blackjack value of a card for strategy purposes: face cards 10, ace 11 */
export function cardValue(card: PlayingCardKey): number {
  const rank = Number(card.split('_')[1]);
  if (rank === 14) return 11;
  return Math.min(rank, 10);
}

/** A recommended move for a hand, and the situation it answers */
export type StrategyHint = {
  move: BotMove;
  /** the hand as the chart reads it: "Hard 16", "Soft 18", "Pair of 8s" */
  hand: string;
  /** the dealer's face-up card as the chart reads it: "9", "10", "ace" */
  dealer: string;
  /** one line for the player, such as "Soft 18 vs dealer 9: hit" */
  reason: string;
};

export type StrategyOptions = {
  /** the cards of the hand to play */
  cards: PlayingCardKey[];
  /** the dealer's face-up card */
  dealerUpCard: PlayingCardKey | undefined;
  /** whether doubling down is allowed on this hand right now */
  canDouble: boolean;
  /** whether splitting is allowed on this hand right now */
  canSplit: boolean;
  /** what the dealer does on soft 17 at this table; a few plays depend on it. Stands by default */
  dealerSoft17?: TableRules['dealerSoft17'];
  /** how many decks are in the shoe; with one or two, some plays differ. A shoe of six by default */
  numberOfDecks?: TableRules['numberOfDecks'];
  /** whether doubling down after a split is allowed at this table */
  doubleAfterSplit?: TableRules['doubleAfterSplit'];
  /** whether late surrender is allowed on this hand right now */
  canSurrender?: boolean;
};

/** What a chart needs to know about the table */
type Table = {
  /** the dealer hits soft 17 */
  hitsSoft17: boolean;
  /** one, two, or a shoe: charts for four to eight decks are the same, so they count as six */
  decks: 1 | 2 | 6;
  /** doubling down after a split is allowed */
  doubleAfterSplit: boolean;
};

/** A chart cell: whether to double down when that is allowed, and the play when it is not */
type Play = { double: boolean; otherwise: BotMove };

const MOVE_WORDS: Record<BotMove, string> = { hit: 'hit', stay: 'stay', double: 'double down', split: 'split', surrender: 'surrender' };
const RANK_NAMES: Record<number, string> = { 11: 'jacks', 12: 'queens', 13: 'kings', 14: 'aces' };
const ACE = 11;

const rankOf = (card: PlayingCardKey): number => Number(card.split('_')[1]);
const between = (value: number, low: number, high: number): boolean => value >= low && value <= high;

/**
 * Whether the chart splits a pair of this rank against the dealer's card. This table does
 * not allow doubling down after a split, which is why low pairs are split less often than
 * on charts drawn for tables that do.
 */
function splitsPair(rank: number, up: number, { decks, doubleAfterSplit }: Table): boolean {
  if (rank === 14 || rank === 8) return true;
  if (rank === 9) return between(up, 2, 6) || up === 8 || up === 9;
  if (rank === 7) return between(up, 2, 7);
  if (rank === 6) return between(up, doubleAfterSplit || decks !== 6 ? 2 : 3, 6);
  if (rank === 4) return doubleAfterSplit && between(up, 5, 6);
  if (rank === 3) return between(up, doubleAfterSplit ? 2 : 4, 7);
  if (rank === 2) return between(up, doubleAfterSplit ? 2 : decks === 1 ? 3 : 4, 7);
  // fives and ten-value cards play better as the total they make
  return false;
}

/**
 * The few pairs that do not play as the total they make when they are not split. With so
 * few decks, the two cards in the hand are a real share of the cards that would help or hurt.
 */
function unsplitPair(rank: number, up: number, { decks, hitsSoft17 }: Table): Play | undefined {
  // two sevens gone leave little chance of drawing the third for 21
  if (rank === 7 && up === 10 && decks === 1) return { double: false, otherwise: 'stay' };
  // a twelve made of sixes has taken none of the tens that would bust it
  if (rank === 6 && up === 3 && (decks === 1 || (decks === 2 && hitsSoft17))) return { double: false, otherwise: 'stay' };
  return undefined;
}

/** What the chart says for a soft total */
function softPlay(total: number, up: number, { decks, hitsSoft17 }: Table): Play {
  if (total >= 20) return { double: false, otherwise: 'stay' };
  if (total === 19) return { double: up === 6 && (hitsSoft17 || decks === 1), otherwise: 'stay' };
  if (total === 18) {
    const doubleFrom = hitsSoft17 && decks !== 1 ? 2 : 3;
    // against an ace, one deck with a dealer who stands on soft 17 is the only table where 18 is enough
    const hits = up === 9 || up === 10 || (up === ACE && !(decks === 1 && !hitsSoft17));
    return { double: between(up, doubleFrom, 6), otherwise: hits ? 'hit' : 'stay' };
  }
  if (total === 17) return { double: between(up, decks === 1 ? 2 : 3, 6), otherwise: 'hit' };
  if (total >= 15) return { double: between(up, 4, 6), otherwise: 'hit' };
  if (total === 14) return { double: between(up, decks === 1 || (decks === 2 && hitsSoft17) ? 4 : 5, 6), otherwise: 'hit' };
  if (total === 13) return { double: between(up, decks === 1 ? 4 : 5, 6), otherwise: 'hit' };
  // soft 12 is a pair of aces that could not be split
  return { double: between(up, decks === 6 ? 6 : 5, 6), otherwise: 'hit' };
}

/** What the chart says for a hard total */
function hardPlay(total: number, up: number, { decks, hitsSoft17 }: Table): Play {
  if (total >= 17) return { double: false, otherwise: 'stay' };
  if (total >= 13) return { double: false, otherwise: up <= 6 ? 'stay' : 'hit' };
  if (total === 12) return { double: false, otherwise: between(up, 4, 6) ? 'stay' : 'hit' };
  if (total === 11) return { double: up <= 10 || hitsSoft17 || decks !== 6, otherwise: 'hit' };
  if (total === 10) return { double: up <= 9, otherwise: 'hit' };
  if (total === 9) return { double: between(up, decks === 6 ? 3 : 2, 6), otherwise: 'hit' };
  if (total === 8) return { double: decks === 1 && between(up, 5, 6), otherwise: 'hit' };
  return { double: false, otherwise: 'hit' };
}

/**
 * The textbook play for a hand against the dealer's face-up card: basic strategy for a
 * table like this one (the dealer checks for a natural before anyone plays, double down on
 * any two cards, none after a split, one split, no surrender), for the number of decks in
 * the shoe and the dealer's rule on soft 17. It is the play with the best expected result
 * when nothing is known but the player's cards and the dealer's card; it does not count cards.
 * The computer characters play it too, as often as their discipline allows (see decideBotMove).
 *
 * The plays were worked out by expected value, drawing from the cards left in the shoe, and
 * agree with the published charts. Shoes of four to eight decks share one chart; one and two
 * decks each differ from it in a handful of plays, which are the `decks` cases below.
 *
 * Returns undefined when there is no hand to play or the dealer's card is not known.
 */
export function recommendMove(options: StrategyOptions): StrategyHint | undefined {
  const { cards, dealerUpCard, canDouble, canSplit } = options;
  if (cards.length < 2 || !dealerUpCard) return undefined;

  const table: Table = {
    hitsSoft17: options.dealerSoft17 === 'hit',
    decks: options.numberOfDecks === '1' ? 1 : options.numberOfDecks === '2' ? 2 : 6,
    doubleAfterSplit: Boolean(options.doubleAfterSplit),
  };
  const up = cardValue(dealerUpCard);
  const { aceAsOne, aceAsEleven, highest } = handValue(cards);
  const isSoft = aceAsEleven !== aceAsOne && aceAsEleven <= 21;
  const isPair = cards.length === 2 && rankOf(cards[0]) === rankOf(cards[1]);
  const pairRank = rankOf(cards[0]);

  let move: BotMove;
  // a pair is read as a pair only when it can be split; otherwise it is the total it makes
  let hand = `${isSoft ? 'Soft' : 'Hard'} ${highest}`;
  if (isPair && canSplit) hand = `Pair of ${RANK_NAMES[pairRank] ?? `${pairRank}s`}`;

  if (isPair && canSplit && splitsPair(pairRank, up, table)) {
    move = 'split';
  } else if (options.canSurrender && !isSoft && ((highest === 16 && (up === 9 || up === 10 || up === ACE)) || (highest === 15 && up === 10))) {
    move = 'surrender';
  } else {
    const play = (isPair ? unsplitPair(pairRank, up, table) : undefined)
      ?? (isSoft ? softPlay(highest, up, table) : hardPlay(highest, up, table));
    move = play.double && canDouble ? 'double' : play.otherwise;
  }

  const dealer = up === ACE ? 'ace' : String(up);
  return { move, hand, dealer, reason: `${hand} vs dealer ${dealer}: ${MOVE_WORDS[move]}` };
}
