// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CARD_SUITS, buildCardKeys, cardPointValue, formatCardName, parseCard } from './cards';

describe('cards', () => {
  it('parses face cards, pip cards, and multi-deck copy keys', () => {
    const queen = parseCard('Heart_12');
    expect(queen).toEqual({
      key: 'Heart_12',
      suit: CARD_SUITS.Heart,
      description: 'Queen',
      sort: { name: 'Q', value: 12 },
    });

    expect(parseCard('Club_7').sort).toEqual({ name: '7', value: 7 });

    const aceCopy = parseCard('Spade_14_3');
    expect(aceCopy).toEqual({
      key: 'Spade_14_3',
      suit: CARD_SUITS.Spade,
      description: 'Ace',
      sort: { name: 'A', value: 14 },
    });
  });

  it('formats card names from their keys', () => {
    expect(formatCardName('Heart_12')).toBe('Queen of Hearts');
    expect(formatCardName('Spade_14_3')).toBe('Ace of Spades');
  });

  it('computes blackjack point values for aces, faces, tens, and pips', () => {
    expect(cardPointValue('Spade_14')).toEqual([1, 11]);
    expect(cardPointValue('Spade_13')).toEqual([10, 10]);
    expect(cardPointValue('Spade_10')).toEqual([10, 10]);
    expect(cardPointValue('Spade_9_2')).toEqual([9, 9]);
  });

  it('builds unique card keys per deck in canonical suit order', () => {
    const single = buildCardKeys();
    expect(single).toHaveLength(52);
    expect(new Set(single).size).toBe(52);
    expect(single[0]).toBe('Club_2');
    expect(single.at(-1)).toBe('Spade_14');

    const double = buildCardKeys(2);
    expect(double).toHaveLength(104);
    expect(new Set(double).size).toBe(104);
    expect(double).toEqual(expect.arrayContaining(['Spade_14', 'Spade_14_2']));

    const six = buildCardKeys(6);
    expect(six).toHaveLength(312);
    expect(new Set(six).size).toBe(312);
  });
});
