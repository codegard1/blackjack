// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { playerDefaults } from '../definitions';
import { PlayerAction } from '../enums';
import { PlayerStats } from '../types';
import { PlayerStore } from './PlayerStore';

/** a stats frame: zero for everything but the figures given */
const frame = (figures: Partial<PlayerStats>): PlayerStats => ({ ...playerDefaults.stats, ...figures } as PlayerStats);

const seated = () => {
  const store = new PlayerStore();
  store.newPlayer({ key: 'chris', title: 'Chris', isNPC: false, id: 1, bank: 100 });
  store.newPlayer({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', id: 2, bank: 100 });
  store.newPlayer({ key: 'dealer', title: 'Faxe', isNPC: true, id: 3, bank: 1000 });
  return store;
};

describe('PlayerStore', () => {
  it('seats players in order with a role, default stats and no duplicates', () => {
    const store = seated();
    expect(store.activePlayerKeys).toEqual(['chris', 'ogion', 'dealer']);
    expect(store.length).toBe(3);
    expect(store.all.map((player) => player.role)).toEqual(['human', 'bot', 'dealer']);
    expect(store.playerName('ogion')).toBe('Ogion');
    expect(store.stats('chris')).toMatchObject({ numberOfGamesPlayed: 0, netResult: 0 });

    // a key that is taken keeps its first player
    store.newPlayer({ key: 'chris', title: 'Impostor', isNPC: false, id: 9, bank: 5 });
    expect(store.player('chris')).toMatchObject({ title: 'Chris', bank: 100 });

    // stats given at the table are kept on top of the defaults
    store.newPlayer({ key: 'shevek', title: 'Shevek', isNPC: true, role: 'bot', id: 4, bank: 10, stats: frame({ numberOfGamesWon: 3 }) });
    expect(store.stats('shevek')).toMatchObject({ numberOfGamesWon: 3, numberOfGamesLost: 0 });
  });

  it('restores a saved state', () => {
    const saved = seated();
    saved.currentPlayerKey = 'ogion';
    const restored = new PlayerStore(saved.state);
    expect(restored.state).toEqual(saved.state);
    expect(restored.currentPlayer?.title).toBe('Ogion');
    expect(restored.isCurrentPlayerNPC).toBe(true);
    expect(new PlayerStore().currentPlayer).toBeUndefined();
    expect(new PlayerStore().isCurrentPlayerNPC).toBe(false);
  });

  it('takes antes and bets from the bank only when it can cover them', () => {
    const store = seated();
    expect(store.ante('chris', 25)).toBe(true);
    expect(store.player('chris')).toMatchObject({ bank: 75, lastAnte: 25, lastAction: PlayerAction.Ante });
    expect(store.bet('chris', 25)).toBe(true);
    expect(store.bet('chris', 25)).toBe(true);
    expect(store.player('chris')).toMatchObject({ bank: 25, lastBet: 25, totalBet: 50, lastAction: PlayerAction.Bet });

    expect(store.bet('chris', 26)).toBe(false);
    expect(store.ante('chris', 26)).toBe(false);
    expect(store.player('chris').bank).toBe(25);

    store.payout('chris', 100);
    expect(store.player('chris').bank).toBe(125);
  });

  it('tracks turns, stays, busts and finishing', () => {
    const store = seated();
    store.startTurn('chris');
    expect(store.player('chris')).toMatchObject({ turn: true, isFinished: false, lastAction: PlayerAction.StartTurn });
    store.hit('chris');
    expect(store.player('chris').lastAction).toBe(PlayerAction.Hit);

    store.stay('chris');
    expect(store.player('chris')).toMatchObject({ isStaying: true, isFinished: true, turn: false });
    store.bust('ogion');
    expect(store.player('ogion')).toMatchObject({ isBusted: true, isFinished: true, turn: false });

    store.allPlayersFinish();
    expect(store.all.every((player) => player.isFinished)).toBe(true);
  });

  it('passes the turn around the table and back to the first seat', () => {
    const store = seated();
    store.currentPlayerKey = 'chris';
    store.nextPlayer();
    expect(store.currentPlayerKey).toBe('ogion');
    store.nextPlayer();
    store.nextPlayer();
    expect(store.currentPlayerKey).toBe('chris');
    expect(store.player('chris').turn).toBe(true);
  });

  it('clears the round from every player but keeps the bank, the stats and the losing streak', () => {
    const store = seated();
    store.ante('chris', 25);
    store.bust('chris');
    Object.assign(store.player('chris'), { lossStreak: 2, result: 'loss', net: -25 });
    store.updateStats('chris', frame({ numberOfGamesPlayed: 1, numberOfGamesLost: 1 }));
    store.currentPlayerKey = 'dealer';

    store.reset();
    expect(store.currentPlayerKey).toBe('chris');
    const chris = store.player('chris');
    expect(chris).toMatchObject({ bank: 75, lossStreak: 2, isBusted: false, isFinished: false, totalBet: 0 });
    expect(chris.result).toBeUndefined();
    expect(chris.net).toBeUndefined();
    expect(chris.stats).toMatchObject({ numberOfGamesPlayed: 1, numberOfGamesLost: 1 });
    expect(store.player('ogion').role).toBe('bot');

    const empty = new PlayerStore();
    empty.reset();
    expect(empty.currentPlayerKey).toBeUndefined();
  });

  it('adds to the stats and keeps the win to loss ratio in step', () => {
    const store = seated();
    store.updateStats('chris', frame({ numberOfGamesPlayed: 3, numberOfGamesWon: 2, numberOfGamesLost: 1, netResult: 50, winLossRatio: 99 }));
    expect(store.stats('chris')).toMatchObject({ numberOfGamesPlayed: 3, numberOfGamesWon: 2, numberOfGamesLost: 1, netResult: 50, winLossRatio: 2 });
    store.updateStats('chris', frame({ numberOfGamesLost: 3, netResult: -75 }));
    expect(store.stats('chris')).toMatchObject({ numberOfGamesLost: 4, netResult: -25, winLossRatio: 0.5 });
    // with no wins or no losses yet, each counts as one
    expect(store.calculateWinLossRatio('ogion')).toBe(1);
  });
});
