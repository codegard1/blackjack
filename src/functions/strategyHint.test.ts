// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { recommendMove } from './strategyHint';

/** The dealer's face-up cards across a chart, left to right: 2 to 10, then the ace */
const DEALER_CARDS = ['Club_2', 'Club_3', 'Club_4', 'Club_5', 'Club_6', 'Club_7', 'Club_8', 'Club_9', 'Club_10', 'Club_14'];

const MOVES = { H: 'hit', S: 'stay', D: 'double', P: 'split' } as const;
type Letter = keyof typeof MOVES;

/** One row of a chart: a hand, and the play against each dealer card, as letters */
type Row = [name: string, cards: string[], plays: string];

/** Check every cell of a chart */
function expectChart(rows: Row[], options: { canDouble: boolean; canSplit: boolean; dealerSoft17?: 'stand' | 'hit' }) {
  for (const [name, cards, plays] of rows) {
    const letters = plays.split(' ') as Letter[];
    expect(letters, name).toHaveLength(DEALER_CARDS.length);
    DEALER_CARDS.forEach((dealerUpCard, column) => {
      const hint = recommendMove({ cards, dealerUpCard, ...options });
      expect(hint?.move, `${name} vs ${dealerUpCard}`).toBe(MOVES[letters[column]]);
    });
  }
}

// Basic strategy for four to eight decks, dealer stands on soft 17, double on any two cards,
// no double after a split, no surrender. Columns: dealer 2 3 4 5 6 7 8 9 10 A.
const HARD: Row[] = [
  ['hard 5', ['Heart_2', 'Spade_3'], 'H H H H H H H H H H'],
  ['hard 6', ['Heart_2', 'Spade_4'], 'H H H H H H H H H H'],
  ['hard 7', ['Heart_3', 'Spade_4'], 'H H H H H H H H H H'],
  ['hard 8', ['Heart_3', 'Spade_5'], 'H H H H H H H H H H'],
  ['hard 9', ['Heart_4', 'Spade_5'], 'H D D D D H H H H H'],
  ['hard 10', ['Heart_4', 'Spade_6'], 'D D D D D D D D H H'],
  ['hard 11', ['Heart_5', 'Spade_6'], 'D D D D D D D D D H'],
  ['hard 12', ['Heart_10', 'Spade_2'], 'H H S S S H H H H H'],
  ['hard 13', ['Heart_10', 'Spade_3'], 'S S S S S H H H H H'],
  ['hard 14', ['Heart_10', 'Spade_4'], 'S S S S S H H H H H'],
  ['hard 15', ['Heart_10', 'Spade_5'], 'S S S S S H H H H H'],
  ['hard 16', ['Heart_10', 'Spade_6'], 'S S S S S H H H H H'],
  ['hard 17', ['Heart_10', 'Spade_7'], 'S S S S S S S S S S'],
  ['hard 18', ['Heart_10', 'Spade_8'], 'S S S S S S S S S S'],
  ['hard 19', ['Heart_10', 'Spade_9'], 'S S S S S S S S S S'],
  ['hard 20', ['Heart_10', 'Spade_13'], 'S S S S S S S S S S'],
];

const SOFT: Row[] = [
  ['soft 13', ['Heart_14', 'Spade_2'], 'H H H D D H H H H H'],
  ['soft 14', ['Heart_14', 'Spade_3'], 'H H H D D H H H H H'],
  ['soft 15', ['Heart_14', 'Spade_4'], 'H H D D D H H H H H'],
  ['soft 16', ['Heart_14', 'Spade_5'], 'H H D D D H H H H H'],
  ['soft 17', ['Heart_14', 'Spade_6'], 'H D D D D H H H H H'],
  ['soft 18', ['Heart_14', 'Spade_7'], 'S D D D D S S H H H'],
  ['soft 19', ['Heart_14', 'Spade_8'], 'S S S S S S S S S S'],
  ['soft 20', ['Heart_14', 'Spade_9'], 'S S S S S S S S S S'],
];

const PAIRS: Row[] = [
  ['pair of 2s', ['Heart_2', 'Spade_2'], 'H H P P P P H H H H'],
  ['pair of 3s', ['Heart_3', 'Spade_3'], 'H H P P P P H H H H'],
  ['pair of 4s', ['Heart_4', 'Spade_4'], 'H H H H H H H H H H'],
  ['pair of 5s', ['Heart_5', 'Spade_5'], 'D D D D D D D D H H'],
  ['pair of 6s', ['Heart_6', 'Spade_6'], 'H P P P P H H H H H'],
  ['pair of 7s', ['Heart_7', 'Spade_7'], 'P P P P P P H H H H'],
  ['pair of 8s', ['Heart_8', 'Spade_8'], 'P P P P P P P P P P'],
  ['pair of 9s', ['Heart_9', 'Spade_9'], 'P P P P P S P P S S'],
  ['pair of 10s', ['Heart_10', 'Spade_10'], 'S S S S S S S S S S'],
  ['pair of kings', ['Heart_13', 'Spade_13'], 'S S S S S S S S S S'],
  ['pair of aces', ['Heart_14', 'Spade_14'], 'P P P P P P P P P P'],
];

describe('recommendMove', () => {
  it('plays hard totals by the chart', () => {
    expectChart(HARD, { canDouble: true, canSplit: false });
  });

  it('plays soft totals by the chart', () => {
    expectChart(SOFT, { canDouble: true, canSplit: false });
  });

  it('plays pairs by the chart for a table with no double down after a split', () => {
    expectChart(PAIRS, { canDouble: true, canSplit: true });
  });

  it('changes three plays when the dealer hits soft 17', () => {
    const hits = { canDouble: true, canSplit: false, dealerSoft17: 'hit' as const };
    expectChart([
      ['hard 11', ['Heart_5', 'Spade_6'], 'D D D D D D D D D D'],
      ['soft 18', ['Heart_14', 'Spade_7'], 'D D D D D S S H H H'],
      ['soft 19', ['Heart_14', 'Spade_8'], 'S S S S D S S S S S'],
    ], hits);
    // and nothing else
    const unchanged = (rows: Row[]) => rows.filter(([name]) => !['hard 11', 'soft 18', 'soft 19'].includes(name));
    expectChart(unchanged(HARD), hits);
    expectChart(unchanged(SOFT), hits);
    expectChart(PAIRS, { ...hits, canSplit: true });
  });

  it('falls back when doubling down is not allowed: hit, except stay on soft 18 and soft 19', () => {
    const noDouble = { canDouble: false, canSplit: false };
    expectChart([
      ['hard 9', ['Heart_4', 'Spade_5'], 'H H H H H H H H H H'],
      ['hard 10', ['Heart_4', 'Spade_6'], 'H H H H H H H H H H'],
      ['hard 11', ['Heart_5', 'Spade_6'], 'H H H H H H H H H H'],
      ['soft 13', ['Heart_14', 'Spade_2'], 'H H H H H H H H H H'],
      ['soft 17', ['Heart_14', 'Spade_6'], 'H H H H H H H H H H'],
      ['soft 18', ['Heart_14', 'Spade_7'], 'S S S S S S S H H H'],
    ], noDouble);
    expectChart([['soft 19', ['Heart_14', 'Spade_8'], 'S S S S S S S S S S']], { ...noDouble, dealerSoft17: 'hit' });
  });

  it('plays a pair as the total it makes when it cannot be split', () => {
    const noSplit = { canDouble: true, canSplit: false };
    expectChart([
      ['pair of 8s as hard 16', ['Heart_8', 'Spade_8'], 'S S S S S H H H H H'],
      ['pair of aces as soft 12', ['Heart_14', 'Spade_14'], 'H H H D D H H H H H'],
      ['pair of 7s as hard 14', ['Heart_7', 'Spade_7'], 'S S S S S H H H H H'],
    ], noSplit);
    expect(recommendMove({ cards: ['Heart_8', 'Spade_8'], dealerUpCard: 'Club_10', ...noSplit })?.hand).toBe('Hard 16');
  });

  it('plays hands of three or more cards by their total, counting an ace as one when eleven would bust', () => {
    const drawn = { canDouble: false, canSplit: false };
    // 5, 3 and 3 are a hard 11 that can no longer be doubled
    expect(recommendMove({ cards: ['Heart_5', 'Spade_3', 'Club_3'], dealerUpCard: 'Club_6', ...drawn })?.move).toBe('hit');
    // ace, 6 and 9 are a hard 16, not a soft one
    const hard16 = recommendMove({ cards: ['Heart_14', 'Spade_6', 'Club_9'], dealerUpCard: 'Diamond_10', ...drawn });
    expect(hard16).toMatchObject({ move: 'hit', hand: 'Hard 16' });
    // ace, 2 and 5 are a soft 18
    const soft18 = recommendMove({ cards: ['Heart_14', 'Spade_2', 'Club_5'], dealerUpCard: 'Diamond_9', ...drawn });
    expect(soft18).toMatchObject({ move: 'hit', hand: 'Soft 18' });
    // a soft 21 stays
    expect(recommendMove({ cards: ['Heart_14', 'Spade_5', 'Club_5'], dealerUpCard: 'Diamond_6', ...drawn })?.move).toBe('stay');
  });

  it('treats a face card the dealer shows as a ten, and reads cards from later decks of a shoe', () => {
    const options = { cards: ['Heart_10', 'Spade_6_3'], canDouble: true, canSplit: false };
    for (const dealerUpCard of ['Club_10', 'Club_11', 'Club_12', 'Club_13_2']) {
      expect(recommendMove({ ...options, dealerUpCard })).toMatchObject({ move: 'hit', dealer: '10' });
    }
    expect(recommendMove({ cards: ['Heart_8_2', 'Spade_8_5'], dealerUpCard: 'Club_14_4', canDouble: true, canSplit: true }))
      .toMatchObject({ move: 'split', dealer: 'ace' });
  });

  it('says what it read and what to do in one line', () => {
    const reason = (cards: string[], dealerUpCard: string, canSplit = false, canDouble = true) =>
      recommendMove({ cards, dealerUpCard, canDouble, canSplit })?.reason;
    expect(reason(['Heart_14', 'Spade_7'], 'Club_9')).toBe('Soft 18 vs dealer 9: hit');
    expect(reason(['Heart_10', 'Spade_6'], 'Club_13')).toBe('Hard 16 vs dealer 10: hit');
    expect(reason(['Heart_5', 'Spade_6'], 'Club_6')).toBe('Hard 11 vs dealer 6: double down');
    expect(reason(['Heart_10', 'Spade_13'], 'Club_14')).toBe('Hard 20 vs dealer ace: stay');
    expect(reason(['Heart_8', 'Spade_8'], 'Club_10', true)).toBe('Pair of 8s vs dealer 10: split');
    expect(reason(['Heart_14', 'Spade_14'], 'Club_6', true)).toBe('Pair of aces vs dealer 6: split');
    expect(reason(['Heart_12', 'Spade_12'], 'Club_6', true)).toBe('Pair of queens vs dealer 6: stay');
    expect(reason(['Heart_10', 'Spade_10'], 'Club_6', true)).toBe('Pair of 10s vs dealer 6: stay');
  });

  it('has nothing to say without a hand or without the dealer\'s card', () => {
    expect(recommendMove({ cards: [], dealerUpCard: 'Club_9', canDouble: true, canSplit: false })).toBeUndefined();
    expect(recommendMove({ cards: ['Heart_10'], dealerUpCard: 'Club_9', canDouble: true, canSplit: false })).toBeUndefined();
    expect(recommendMove({ cards: ['Heart_10', 'Spade_6'], dealerUpCard: undefined, canDouble: true, canSplit: false })).toBeUndefined();
  });
});
