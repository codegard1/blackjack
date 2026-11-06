import { describe, expect, it } from 'vitest';
import { BOTS, DEALER } from '../characters';
import { CHARACTER_HISTORY, historyRounds, withHistory } from './history';
import { emptyStats } from './profiles';
import { seededRandom, simulateHistory } from './simulate';

describe('simulateHistory', () => {
  const result = simulateHistory({ rounds: 400, rng: seededRandom(42) });

  it('plays the requested number of real rounds, with the dealer at every one', () => {
    expect(result.rounds).toBe(400);
    expect(result.stats[DEALER.id].numberOfGamesPlayed).toBe(400);
    expect(result.sessions).toBeGreaterThan(1);
  });

  it('keeps every record consistent', () => {
    for (const bot of BOTS) {
      const stats = result.stats[bot.id];
      expect(stats.numberOfGamesWon + stats.numberOfGamesLost).toBeLessThanOrEqual(stats.numberOfGamesPlayed);
      // a player's bust always loses the hand
      expect(stats.numberOfTimesBusted).toBeLessThanOrEqual(stats.numberOfGamesLost);
      expect(stats.numberOfTimesBlackjack).toBeLessThanOrEqual(stats.numberOfGamesPlayed);
    }
  });

  it('balances the money: what the players lose, the house wins', () => {
    const total = Object.values(result.net).reduce((sum, net) => sum + net, 0);
    expect(total).toBe(0);
    expect(result.net[DEALER.id]).toBe(-BOTS.reduce((sum, bot) => sum + result.net[bot.id], 0));
  });

  it('gives the same history for the same seed', () => {
    expect(simulateHistory({ rounds: 400, rng: seededRandom(42) })).toEqual(result);
    expect(simulateHistory({ rounds: 400, rng: seededRandom(43) }).stats).not.toEqual(result.stats);
  });

  it('puts Math.random back when it is done', () => {
    const before = Math.random;
    simulateHistory({ rounds: 10, rng: seededRandom(1) });
    expect(Math.random).toBe(before);
  });
});

describe('character history', () => {
  it('has a history for every character in the saved file', () => {
    for (const character of [...BOTS, DEALER]) {
      expect(historyRounds(character.id)).toBeGreaterThan(0);
    }
    expect(historyRounds(DEALER.id)).toBe(CHARACTER_HISTORY.rounds);
  });

  it('adds the history to what a character has played here, and leaves humans alone', () => {
    const here = { ...emptyStats(), numberOfGamesPlayed: 3, numberOfGamesWon: 2 };
    const history = CHARACTER_HISTORY.stats.ogion;

    expect(withHistory('ogion', here)).toMatchObject({
      numberOfGamesPlayed: history.numberOfGamesPlayed + 3,
      numberOfGamesWon: history.numberOfGamesWon + 2,
      numberOfGamesLost: history.numberOfGamesLost,
    });
    expect(withHistory('chris', here)).toBe(here);
  });
});
