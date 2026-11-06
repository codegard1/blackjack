import { CharacterStats } from "../characters";
import { PlayingCardKey } from "../types";
import { handValue } from "./getHandValue";

export type BotMove = 'hit' | 'stay' | 'double';

/** A number in [0, 1); Math.random by default, fixed in tests */
export type Rng = () => number;

/** Effective stats never go above these, however long the losing streak */
const MAX_NERVE = 10;
const MAX_AGGRESSION = 15;

/** Blackjack value of a card for strategy purposes: face cards 10, ace 11 */
export function cardValue(card: PlayingCardKey): number {
  const rank = Number(card.split('_')[1]);
  if (rank === 14) return 11;
  return Math.min(rank, 10);
}

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

/**
 * A simplified basic strategy for a single hand.
 * @param cards the player's cards
 * @param dealerUpCard the dealer's face-up card, or undefined if it is not known
 * @param canDouble true when doubling down is allowed right now
 */
export function basicStrategy(cards: PlayingCardKey[], dealerUpCard: PlayingCardKey | undefined, canDouble: boolean): BotMove {
  const { aceAsOne, aceAsEleven, highest } = handValue(cards);
  const isSoft = aceAsEleven !== aceAsOne && aceAsEleven <= 21;
  const up = dealerUpCard ? cardValue(dealerUpCard) : 10;
  const double = (move: BotMove): BotMove => (canDouble ? 'double' : move);

  if (isSoft) {
    if (highest >= 19) return 'stay';
    if (highest === 18) return up <= 8 ? 'stay' : 'hit';
    return 'hit';
  }

  if (highest >= 17) return 'stay';
  if (highest >= 13) return up <= 6 ? 'stay' : 'hit';
  if (highest === 12) return up >= 4 && up <= 6 ? 'stay' : 'hit';
  if (highest === 11) return double('hit');
  if (highest === 10) return up <= 9 ? double('hit') : 'hit';
  if (highest === 9) return up >= 3 && up <= 6 ? double('hit') : 'hit';
  return 'hit';
}

/** The total at which a character stops hitting on instinct: 13 at nerve 2, 18 at nerve 9 */
export function standingTotal(nerve: number): number {
  return Math.round(11 + nerve * 0.75);
}

/**
 * Decide a computer character's move. With a chance of discipline in ten the
 * character makes the textbook play; otherwise it goes on instinct, hitting
 * until its nerve runs out. Passive characters (aggression 3 or less) never
 * double down, and only aggressive ones (6 or more) double on instinct.
 */
export function decideBotMove(options: {
  cards: PlayingCardKey[];
  dealerUpCard: PlayingCardKey | undefined;
  stats: CharacterStats;
  lossStreak?: number;
  canDouble: boolean;
  rng?: Rng;
}): BotMove {
  const { cards, dealerUpCard, canDouble, rng = Math.random } = options;
  const stats = effectiveStats(options.stats, options.lossStreak);
  const isPassive = stats.aggression <= 3;
  const total = handValue(cards).highest;

  if (rng() < stats.discipline / 10) {
    const move = basicStrategy(cards, dealerUpCard, canDouble && !isPassive);
    return move;
  }

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
