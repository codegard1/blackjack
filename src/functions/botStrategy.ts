import { CharacterStats } from "../characters";
import { PlayingCardKey, TableRules } from "../types";
import { handValue } from "./getHandValue";
import { BotMove, recommendMove } from "./strategyHint";

export type { BotMove } from "./strategyHint";
export { cardValue } from "./strategyHint";

/** A number in [0, 1); Math.random by default, fixed in tests */
export type Rng = () => number;

/** Effective stats never go above these, however long the losing streak */
const MAX_NERVE = 10;
const MAX_AGGRESSION = 15;

/**
 * The character's stats after a losing streak: tilt raises nerve and aggression
 * by half a point per point of tilt for every loss in a row.
 */
export function effectiveStats(stats: CharacterStats, lossStreak = 0): CharacterStats {
  const boost = stats.tilt * Math.max(0, lossStreak) * 0.5;
  return {
    ...stats,
    nerve: Math.min(MAX_NERVE, stats.nerve + boost),
    aggression: Math.min(MAX_AGGRESSION, stats.aggression + boost),
  };
}

/** The total at which a character stops hitting on instinct: 13 at nerve 2, 18 at nerve 9 */
export function standingTotal(nerve: number): number {
  return Math.round(11 + nerve * 0.75);
}

/**
 * Decide a computer character's move. With a chance of discipline in ten the
 * character makes the textbook play for the table (see recommendMove, which also
 * gives the human's hints); otherwise it goes on instinct, hitting until its nerve
 * runs out. Passive characters (aggression 3 or less) never double down, and only
 * aggressive ones (6 or more) double on instinct.
 */
export function decideBotMove(options: {
  cards: PlayingCardKey[];
  dealerUpCard: PlayingCardKey | undefined;
  stats: CharacterStats;
  lossStreak?: number;
  canDouble: boolean;
  canSplit?: boolean;
  canSurrender?: boolean;
  /** the rules of the table in play, which the textbook play depends on */
  tableRules?: Partial<Pick<TableRules, 'dealerSoft17' | 'numberOfDecks' | 'doubleAfterSplit'>>;
  rng?: Rng;
}): BotMove {
  const { cards, dealerUpCard, canDouble, canSplit = false, canSurrender = false, rng = Math.random } = options;
  const stats = effectiveStats(options.stats, options.lossStreak);
  const isPassive = stats.aggression <= 3;
  const total = handValue(cards).highest;

  if (rng() < stats.discipline / 10) {
    const textbook = recommendMove({
      cards,
      dealerUpCard,
      canDouble: canDouble && !isPassive,
      canSplit,
      canSurrender: canSurrender && stats.aggression < 8,
      ...options.tableRules,
    });
    // without the dealer's card there is no textbook play, and the character goes on instinct
    if (textbook) return textbook.move;
  }

  const rank = cards[0]?.split('_')[1];
  const pairIsStrong = cards.length === 2 && rank === cards[1]?.split('_')[1] && (rank === '14' || rank === '8');
  if (canSplit && pairIsStrong && stats.aggression >= 9) return 'split';
  if (canDouble && stats.aggression >= 6 && total >= 9 && total <= 11) return 'double';
  return total < standingTotal(stats.nerve) ? 'hit' : 'stay';
}

/**
 * How many minimum bets a character adds after the ante: one for every four
 * points of aggression, and a chance of one more that grows with aggression.
 */
export function botWagerCount(stats: CharacterStats, lossStreak = 0, rng: Rng = Math.random): number {
  const { aggression } = effectiveStats(stats, lossStreak);
  return Math.floor(aggression / 4) + (rng() < aggression / 20 ? 1 : 0);
}

/** Whether a computer character takes insurance against a dealer ace */
export function decideBotInsurance(stats: CharacterStats, rng: Rng = Math.random): boolean {
  if (stats.discipline >= 8) return false;
  return rng() < (10 - stats.discipline) * 0.04;
}
