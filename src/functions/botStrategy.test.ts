import { describe, expect, it } from 'vitest';
import { BOTS, CHARACTERS, DEALER, getCharacter } from '../characters';
import { basicSplitStrategy, basicStrategy, botWagerCount, decideBotMove, effectiveStats, standingTotal } from './botStrategy';

const stats = (id: string) => getCharacter(id)!.stats!;
/** a fixed roll: 0 always passes the discipline check, 0.99 never does */
const roll = (value: number) => () => value;

describe('basicStrategy', () => {
  it('stands on hard 17 and on 13 to 16 against a weak dealer card', () => {
    expect(basicStrategy(['Club_10', 'Heart_7'], 'Spade_10', true)).toBe('stay');
    expect(basicStrategy(['Club_10', 'Heart_3'], 'Spade_6', true)).toBe('stay');
    expect(basicStrategy(['Club_10', 'Heart_6'], 'Spade_10', true)).toBe('hit');
  });

  describe('pair strategy', () => {
    it('splits matching aces and eights, but not different ten-value ranks', () => {
      expect(basicSplitStrategy(['Club_14', 'Heart_14'], 'Spade_10')).toBe(true);
      expect(basicSplitStrategy(['Club_8', 'Heart_8'], 'Spade_10')).toBe(true);
      expect(basicSplitStrategy(['Club_10', 'Heart_13'], 'Spade_6')).toBe(false);
    });

    it('uses the dealer up-card for conditional pairs', () => {
      expect(basicSplitStrategy(['Club_9', 'Heart_9'], 'Spade_6')).toBe(true);
      expect(basicSplitStrategy(['Club_9', 'Heart_9'], 'Spade_7')).toBe(false);
      expect(basicSplitStrategy(['Club_4', 'Heart_4'], 'Spade_5')).toBe(true);
    });

    it('lets discipline and aggression modulate computer splits', () => {
      expect(decideBotMove({
        cards: ['Club_8', 'Heart_8'], dealerUpCard: 'Spade_6', stats: stats('shevek'),
        canDouble: false, canSplit: true, rng: roll(0),
      })).toBe('split');
      expect(decideBotMove({
        cards: ['Club_8', 'Heart_8'], dealerUpCard: 'Spade_6',
        stats: { ...stats('ogion'), discipline: 0, aggression: 10 },
        canDouble: false, canSplit: true, rng: roll(0.99),
      })).toBe('split');
      expect(decideBotMove({
        cards: ['Club_8', 'Heart_8'], dealerUpCard: 'Spade_6',
        stats: { ...stats('ogion'), discipline: 0, aggression: 8 },
        canDouble: false, canSplit: true, rng: roll(0.99),
      })).not.toBe('split');
    });
  });

  it('doubles on 11 when allowed, and hits otherwise', () => {
    expect(basicStrategy(['Club_5', 'Heart_6'], 'Spade_10', true)).toBe('double');
    expect(basicStrategy(['Club_5', 'Heart_6'], 'Spade_10', false)).toBe('hit');
  });

  it('plays soft hands: stands on soft 19, hits soft 17', () => {
    expect(basicStrategy(['Club_14', 'Heart_8'], 'Spade_10', true)).toBe('stay');
    expect(basicStrategy(['Club_14', 'Heart_6'], 'Spade_10', true)).toBe('hit');
  });
});

describe('character play', () => {
  it('maps nerve to the total each character stands on', () => {
    expect(BOTS.map((bot) => standingTotal(bot.stats!.nerve))).toEqual([13, 15, 18, 17]);
  });

  it('The Rock stands on 13 against a dealer 6 on instinct', () => {
    expect(decideBotMove({ cards: ['Club_10', 'Heart_3'], dealerUpCard: 'Spade_6', stats: stats('ogion'), canDouble: true, rng: roll(0.99) })).toBe('stay');
  });

  it('The Tourist hits 16 on instinct', () => {
    expect(decideBotMove({ cards: ['Club_10', 'Heart_6'], dealerUpCard: 'Spade_6', stats: stats('genly-ai'), canDouble: true, rng: roll(0.99) })).toBe('hit');
  });

  it('The Shark always makes the textbook play, including doubling on 11', () => {
    expect(decideBotMove({ cards: ['Club_5', 'Heart_6'], dealerUpCard: 'Spade_10', stats: stats('shevek'), canDouble: true, rng: roll(0.99) })).toBe('double');
  });

  it('a passive character never doubles, even when the textbook says to', () => {
    expect(decideBotMove({ cards: ['Club_5', 'Heart_6'], dealerUpCard: 'Spade_10', stats: stats('ogion'), canDouble: true, rng: roll(0) })).toBe('hit');
  });

  it('The Maniac doubles 10 on instinct', () => {
    expect(decideBotMove({ cards: ['Club_4', 'Heart_6'], dealerUpCard: 'Spade_14', stats: stats('haber'), canDouble: true, rng: roll(0.99) })).toBe('double');
  });

  it('tilt raises nerve and aggression with each loss in a row', () => {
    expect(effectiveStats(stats('haber'), 2)).toMatchObject({ nerve: 10, aggression: 15 });
    expect(effectiveStats(stats('shevek'), 0)).toEqual(stats('shevek'));
  });

  it('The Maniac bets more after two losses; The Rock only antes', () => {
    expect(botWagerCount(stats('haber'), 0, roll(0.99))).toBe(2);
    expect(botWagerCount(stats('haber'), 2, roll(0.99))).toBe(3);
    expect(botWagerCount(stats('ogion'), 0, roll(0.99))).toBe(0);
  });
});

describe('characters', () => {
  it('gives every character a complete profile with stats from 1 to 10', () => {
    const ids = CHARACTERS.map((character) => character.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const character of CHARACTERS) {
      expect(character.name && character.nickname && character.tagline && character.portraitAlt).toBeTruthy();
      expect(character.backstory.length).toBeGreaterThan(0);
      expect(character.portrait).toBeTruthy();
    }
    for (const bot of BOTS) {
      Object.values(bot.stats!).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      });
    }
    expect(DEALER.stats).toBeUndefined();
  });
});
