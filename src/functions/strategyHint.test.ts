// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { TableRules, deckCounts } from '../types';
import { recommendMove } from './strategyHint';
import { CHARTS, ChartKey } from './strategyHint.charts';

/** The dealer's face-up cards across a chart, left to right: 2 to 10, then the ace */
const DEALER_CARDS = ['Club_2', 'Club_3', 'Club_4', 'Club_5', 'Club_6', 'Club_7', 'Club_8', 'Club_9', 'Club_10', 'Club_14'];

const MOVES: Record<string, string> = { H: 'hit', S: 'stay', D: 'double', P: 'split' };

/** A two-card hand for each row of a chart */
const HANDS: Record<string, string[]> = {
  'hard 5': ['Heart_2', 'Spade_3'], 'hard 6': ['Heart_2', 'Spade_4'], 'hard 7': ['Heart_3', 'Spade_4'], 'hard 8': ['Heart_3', 'Spade_5'],
  'hard 9': ['Heart_4', 'Spade_5'], 'hard 10': ['Heart_4', 'Spade_6'], 'hard 11': ['Heart_5', 'Spade_6'], 'hard 12': ['Heart_10', 'Spade_2'],
  'hard 13': ['Heart_10', 'Spade_3'], 'hard 14': ['Heart_10', 'Spade_4'], 'hard 15': ['Heart_10', 'Spade_5'], 'hard 16': ['Heart_10', 'Spade_6'],
  'hard 17': ['Heart_10', 'Spade_7'], 'hard 18': ['Heart_10', 'Spade_8'], 'hard 19': ['Heart_10', 'Spade_9'], 'hard 20': ['Heart_10', 'Spade_13'],
  'soft 13': ['Heart_14', 'Spade_2'], 'soft 14': ['Heart_14', 'Spade_3'], 'soft 15': ['Heart_14', 'Spade_4'], 'soft 16': ['Heart_14', 'Spade_5'],
  'soft 17': ['Heart_14', 'Spade_6'], 'soft 18': ['Heart_14', 'Spade_7'], 'soft 19': ['Heart_14', 'Spade_8'], 'soft 20': ['Heart_14', 'Spade_9'],
  'pair 2': ['Heart_2', 'Spade_2'], 'pair 3': ['Heart_3', 'Spade_3'], 'pair 4': ['Heart_4', 'Spade_4'], 'pair 5': ['Heart_5', 'Spade_5'],
  'pair 6': ['Heart_6', 'Spade_6'], 'pair 7': ['Heart_7', 'Spade_7'], 'pair 8': ['Heart_8', 'Spade_8'], 'pair 9': ['Heart_9', 'Spade_9'],
  'pair 10': ['Heart_10', 'Spade_10'], 'pair A': ['Heart_14', 'Spade_14'],
};

/** The play a chart cell names when a double down, a split, both or neither is allowed */
function playFor(cell: string, canDouble: boolean, canSplit: boolean): string {
  let rest = cell.toUpperCase();
  if (rest.startsWith('P')) {
    if (canSplit) return MOVES.P;
    rest = rest.slice(1);
  }
  if (rest.startsWith('D') && rest.length > 1) return canDouble ? MOVES.D : MOVES[rest[1]];
  return MOVES[rest[0]];
}

const TABLES = (Object.keys(CHARTS) as ChartKey[]).map((key) => {
  const [numberOfDecks, soft17] = key.split('-') as [TableRules['numberOfDecks'], string];
  return { key, numberOfDecks, dealerSoft17: soft17 === 'H17' ? 'hit' as const : 'stand' as const };
});

describe('recommendMove', () => {
  it('has a chart for every number of decks the table offers and both soft 17 rules', () => {
    expect(TABLES.map((table) => table.numberOfDecks).sort()).toEqual([...deckCounts, ...deckCounts].sort());
    for (const chart of Object.values(CHARTS)) expect(Object.keys(chart).sort()).toEqual(Object.keys(HANDS).sort());
  });

  describe.each(TABLES)('with $numberOfDecks deck(s) and a dealer who $dealerSoft17s on soft 17', ({ key, numberOfDecks, dealerSoft17 }) => {
    // every row of the chart, against every dealer card, with each choice of what the hand may do
    it.each([
      { canDouble: true, canSplit: true },
      { canDouble: true, canSplit: false },
      { canDouble: false, canSplit: true },
      { canDouble: false, canSplit: false },
    ])('plays every cell of the chart (double down allowed: $canDouble, split allowed: $canSplit)', ({ canDouble, canSplit }) => {
      for (const [row, cells] of Object.entries(CHARTS[key])) {
        const plays = cells.split(' ');
        expect(plays, row).toHaveLength(DEALER_CARDS.length);
        DEALER_CARDS.forEach((dealerUpCard, column) => {
          const hint = recommendMove({ cards: HANDS[row], dealerUpCard, canDouble, canSplit: canSplit && row.startsWith('pair'), dealerSoft17, numberOfDecks });
          expect(hint?.move, `${row} vs ${dealerUpCard}`).toBe(playFor(plays[column], canDouble, canSplit));
        });
      }
    });
  });

  it('plays a shoe of six decks, with a dealer who stands on soft 17, when it is not told the table', () => {
    for (const [row, cells] of Object.entries(CHARTS['6-S17'])) {
      cells.split(' ').forEach((cell, column) => {
        const hint = recommendMove({ cards: HANDS[row], dealerUpCard: DEALER_CARDS[column], canDouble: true, canSplit: true });
        expect(hint?.move, `${row} vs ${DEALER_CARDS[column]}`).toBe(playFor(cell, true, true));
      });
    }
  });

  it('knows the plays that set one deck apart', () => {
    const one = (cards: string[], dealerUpCard: string, canSplit = false) =>
      recommendMove({ cards, dealerUpCard, canDouble: true, canSplit, numberOfDecks: '1' })?.reason;
    expect(one(['Heart_3', 'Spade_5'], 'Club_6')).toBe('Hard 8 vs dealer 6: double down');
    expect(one(['Heart_4', 'Spade_5'], 'Club_2')).toBe('Hard 9 vs dealer 2: double down');
    expect(one(['Heart_5', 'Spade_6'], 'Club_14')).toBe('Hard 11 vs dealer ace: double down');
    expect(one(['Heart_14', 'Spade_7'], 'Club_14')).toBe('Soft 18 vs dealer ace: stay');
    expect(one(['Heart_7', 'Spade_7'], 'Club_10', true)).toBe('Pair of 7s vs dealer 10: stay');
    expect(one(['Heart_2', 'Spade_2'], 'Club_3', true)).toBe('Pair of 2s vs dealer 3: split');
    // the same hands in a shoe
    const shoe = (cards: string[], dealerUpCard: string, canSplit = false) =>
      recommendMove({ cards, dealerUpCard, canDouble: true, canSplit, numberOfDecks: '6' })?.move;
    expect(shoe(['Heart_3', 'Spade_5'], 'Club_6')).toBe('hit');
    expect(shoe(['Heart_7', 'Spade_7'], 'Club_10', true)).toBe('hit');
    expect(shoe(['Heart_2', 'Spade_2'], 'Club_3', true)).toBe('hit');
  });

  it('reads a pair as the total it makes when it cannot be split', () => {
    expect(recommendMove({ cards: ['Heart_8', 'Spade_8'], dealerUpCard: 'Club_10', canDouble: true, canSplit: false }))
      .toMatchObject({ move: 'hit', hand: 'Hard 16' });
    expect(recommendMove({ cards: ['Heart_14', 'Spade_14'], dealerUpCard: 'Club_6', canDouble: true, canSplit: false }))
      .toMatchObject({ move: 'double', hand: 'Soft 12' });
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
