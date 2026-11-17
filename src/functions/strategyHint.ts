import { PlayingCardKey, TableRules } from "../types";
import { BotMove, cardValue } from "./botStrategy";
import { handValue } from "./getHandValue";

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
  /** what the dealer does on soft 17 at this table; a few plays depend on it */
  dealerSoft17?: TableRules['dealerSoft17'];
};

const MOVE_WORDS: Record<BotMove, string> = { hit: 'hit', stay: 'stay', double: 'double down', split: 'split' };
const RANK_NAMES: Record<number, string> = { 11: 'jacks', 12: 'queens', 13: 'kings', 14: 'aces' };

const rankOf = (card: PlayingCardKey): number => Number(card.split('_')[1]);
const between = (value: number, low: number, high: number): boolean => value >= low && value <= high;

/**
 * Whether the chart splits a pair of this rank against the dealer's card. This table does
 * not allow doubling down after a split, which is why low pairs are split less often than
 * on charts drawn for tables that do.
 */
function splitsPair(rank: number, up: number): boolean {
  if (rank === 14 || rank === 8) return true;
  if (rank === 9) return between(up, 2, 6) || up === 8 || up === 9;
  if (rank === 7) return between(up, 2, 7);
  if (rank === 6) return between(up, 3, 6);
  if (rank === 2 || rank === 3) return between(up, 4, 7);
  // fours, fives and ten-value cards play better as the total they make
  return false;
}

/** What the chart says for a soft total; `double` means double down if allowed */
function softPlay(total: number, up: number, hitsSoft17: boolean): { double: boolean; otherwise: BotMove } {
  if (total >= 20) return { double: false, otherwise: 'stay' };
  if (total === 19) return { double: hitsSoft17 && up === 6, otherwise: 'stay' };
  if (total === 18) return { double: between(up, hitsSoft17 ? 2 : 3, 6), otherwise: up >= 9 ? 'hit' : 'stay' };
  if (total === 17) return { double: between(up, 3, 6), otherwise: 'hit' };
  if (total >= 15) return { double: between(up, 4, 6), otherwise: 'hit' };
  return { double: between(up, 5, 6), otherwise: 'hit' };
}

/** What the chart says for a hard total */
function hardPlay(total: number, up: number, hitsSoft17: boolean): { double: boolean; otherwise: BotMove } {
  if (total >= 17) return { double: false, otherwise: 'stay' };
  if (total >= 13) return { double: false, otherwise: up <= 6 ? 'stay' : 'hit' };
  if (total === 12) return { double: false, otherwise: between(up, 4, 6) ? 'stay' : 'hit' };
  if (total === 11) return { double: up <= 10 || hitsSoft17, otherwise: 'hit' };
  if (total === 10) return { double: up <= 9, otherwise: 'hit' };
  if (total === 9) return { double: between(up, 3, 6), otherwise: 'hit' };
  return { double: false, otherwise: 'hit' };
}

/**
 * The textbook play for a hand against the dealer's face-up card: basic strategy as
 * published for shoes of four to eight decks, for a table like this one (double down on
 * any two cards, none after a split, no surrender). It is the play with the best expected
 * result when nothing is known but the player's cards and the dealer's card; it does not
 * count cards. The computer characters do not play by it: they have temperaments of their
 * own (see decideBotMove).
 *
 * Returns undefined when there is no hand to play or the dealer's card is not known.
 */
export function recommendMove(options: StrategyOptions): StrategyHint | undefined {
  const { cards, dealerUpCard, canDouble, canSplit } = options;
  if (cards.length < 2 || !dealerUpCard) return undefined;

  const hitsSoft17 = options.dealerSoft17 === 'hit';
  const up = cardValue(dealerUpCard);
  const { aceAsOne, aceAsEleven, highest } = handValue(cards);
  const isSoft = aceAsEleven !== aceAsOne && aceAsEleven <= 21;
  const isPair = cards.length === 2 && rankOf(cards[0]) === rankOf(cards[1]);
  const pairRank = rankOf(cards[0]);

  let move: BotMove;
  // a pair is read as a pair only when it can be split; otherwise it is the total it makes
  let hand = `${isSoft ? 'Soft' : 'Hard'} ${highest}`;
  if (isPair && canSplit) hand = `Pair of ${RANK_NAMES[pairRank] ?? `${pairRank}s`}`;

  if (isPair && canSplit && splitsPair(pairRank, up)) {
    move = 'split';
  } else {
    const play = isSoft ? softPlay(highest, up, hitsSoft17) : hardPlay(highest, up, hitsSoft17);
    move = play.double && canDouble ? 'double' : play.otherwise;
  }

  const dealer = up === 11 ? 'ace' : String(up);
  return { move, hand, dealer, reason: `${hand} vs dealer ${dealer}: ${MOVE_WORDS[move]}` };
}
