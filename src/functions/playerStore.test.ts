// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { playerDefaults } from '../definitions';
import { PlayerAction } from '../enums';
import { IPlayerStoreState } from '../interfaces';
import { PlayerStats } from '../types';
import {
  activePlayerKeys,
  addPlayer,
  advancePlayer,
  allPlayers,
  antePlayer,
  betPlayer,
  calculateWinLossRatio,
  createPlayer,
  createPlayerStore,
  currentPlayer,
  endPlayerTurn,
  getPlayer,
  hitPlayer,
  payoutPlayer,
  playerCount,
  playerStoreSnapshot,
  replaceRoster,
  resetPlayer,
  resetPlayers,
  setCurrentPlayer,
  startPlayerTurn,
  updatePlayer,
  updatePlayerStats,
} from './playerStore';

/** Freeze a value and everything reachable from it so any mutation throws */
const deepFreeze = <T,>(value: T, seen = new Set<unknown>()): T => {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach((item) => deepFreeze(item, seen));
  return Object.freeze(value);
};

/** a stats frame: zero for everything but the figures given */
const frame = (figures: Partial<PlayerStats>): PlayerStats => ({ ...playerDefaults.stats, ...figures } as PlayerStats);

const seated = (): IPlayerStoreState => {
  let store = createPlayerStore();
  store = addPlayer(store, { key: 'chris', title: 'Chris', isNPC: false, id: 1, bank: 100 });
  store = addPlayer(store, { key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', id: 2, bank: 100 });
  store = addPlayer(store, { key: 'dealer', title: 'Faxe', isNPC: true, id: 3, bank: 1000 });
  return deepFreeze(store);
};

describe('playerStore', () => {
  it('seats players in order with roles, default stats, and no duplicates without mutating inputs', () => {
    const store = seated();
    expect(activePlayerKeys(store)).toEqual(['chris', 'ogion', 'dealer']);
    expect(playerCount(store)).toBe(3);
    expect(allPlayers(store).map((player) => player.role)).toEqual(['human', 'bot', 'dealer']);
    expect(getPlayer(store, 'ogion')?.title).toBe('Ogion');
    expect(getPlayer(store, 'missing')).toBeUndefined();
    expect(getPlayer(store, 'chris')?.stats).toMatchObject({ numberOfGamesPlayed: 0, netResult: 0 });

    // a key that is taken keeps its first player and returns the same store reference
    const duplicate = addPlayer(store, { key: 'chris', title: 'Impostor', isNPC: false, id: 9, bank: 5 });
    expect(duplicate).toBe(store);
    expect(getPlayer(duplicate, 'chris')).toMatchObject({ title: 'Chris', bank: 100 });

    // stats given at the table are kept on top of the defaults without mutating playerDefaults
    const withShevek = addPlayer(store, {
      key: 'shevek',
      title: 'Shevek',
      isNPC: true,
      role: 'bot',
      id: 4,
      bank: 10,
      disabled: true,
      isSittingOut: true,
      stats: frame({ numberOfGamesWon: 3 }),
    });
    expect(getPlayer(withShevek, 'shevek')).toMatchObject({
      disabled: true,
      isSittingOut: true,
      stats: { numberOfGamesWon: 3, numberOfGamesLost: 0 },
    });
    expect(withShevek.players.chris).toBe(store.players.chris);
    expect(playerDefaults.stats.numberOfGamesWon).toBe(0);

    const standalone = createPlayer({ key: 'solo', title: 'Solo', isNPC: false, id: 5, bank: 50 });
    expect(standalone.stats).not.toBe(playerDefaults.stats);
  });

  it('creates defensive plain copies, round-trips snapshots, and defaults missing lastWriteTime', () => {
    const saved = setCurrentPlayer(seated(), 'ogion');
    const snapshot = playerStoreSnapshot(saved);
    expect(snapshot).toEqual({
      players: saved.players,
      activePlayerKeys: ['chris', 'ogion', 'dealer'],
      currentPlayerKey: 'ogion',
      lastWriteTime: '',
    });

    const restored = createPlayerStore(snapshot);
    expect(restored.players).toEqual(saved.players);
    expect(restored.players.chris).not.toBe(saved.players.chris);
    expect(restored.players.chris.stats).not.toBe(saved.players.chris.stats);
    expect(currentPlayer(restored)?.title).toBe('Ogion');
    expect(currentPlayer(restored)?.isNPC).toBe(true);

    const empty = createPlayerStore();
    expect(currentPlayer(empty)).toBeUndefined();

    const missingWriteTime = createPlayerStore({
      players: saved.players,
      currentPlayerKey: 'chris',
    } as IPlayerStoreState);
    expect(missingWriteTime.lastWriteTime).toBe('');
  });

  it('takes antes and bets only when bank covers them, and applies payouts', () => {
    const base = seated();
    const afterAnte = antePlayer(base, 'chris', 25);
    expect(afterAnte.paid).toBe(true);
    expect(getPlayer(afterAnte.store, 'chris')).toMatchObject({
      bank: 75,
      lastAnte: 25,
      lastAction: PlayerAction.Ante,
    });
    expect(afterAnte.store.players.ogion).toBe(base.players.ogion);

    const bet1 = betPlayer(deepFreeze(afterAnte.store), 'chris', 25);
    expect(bet1.paid).toBe(true);
    const bet2 = betPlayer(deepFreeze(bet1.store), 'chris', 25);
    expect(bet2.paid).toBe(true);
    expect(getPlayer(bet2.store, 'chris')).toMatchObject({
      bank: 25,
      lastBet: 25,
      totalBet: 50,
      lastAction: PlayerAction.Bet,
    });

    const frozen = deepFreeze(bet2.store);
    const failedBet = betPlayer(frozen, 'chris', 26);
    expect(failedBet.paid).toBe(false);
    expect(failedBet.store).toBe(frozen);

    const failedAnte = antePlayer(frozen, 'chris', 26);
    expect(failedAnte.paid).toBe(false);
    expect(failedAnte.store).toBe(frozen);

    const missingBet = betPlayer(frozen, 'nobody', 10);
    expect(missingBet).toEqual({ store: frozen, paid: false });
    expect(missingBet.store).toBe(frozen);

    const missingAnte = antePlayer(frozen, 'nobody', 10);
    expect(missingAnte).toEqual({ store: frozen, paid: false });
    expect(missingAnte.store).toBe(frozen);

    const afterPayout = payoutPlayer(frozen, 'chris', 100);
    expect(getPlayer(afterPayout, 'chris')?.bank).toBe(125);
  });

  it('tracks turns, hits, and cycles currentPlayerKey around the table', () => {
    let store = seated();
    store = deepFreeze(startPlayerTurn(store, 'chris'));
    expect(getPlayer(store, 'chris')).toMatchObject({
      turn: true,
      isFinished: false,
      lastAction: PlayerAction.StartTurn,
    });

    store = deepFreeze(hitPlayer(store, 'chris'));
    expect(getPlayer(store, 'chris')?.lastAction).toBe(PlayerAction.Hit);

    store = deepFreeze(endPlayerTurn(store, 'chris'));
    expect(getPlayer(store, 'chris')).toMatchObject({
      turn: false,
      lastAction: PlayerAction.EndTurn,
    });

    const sameCurrent = setCurrentPlayer(store, undefined);
    expect(sameCurrent).toBe(store);

    store = deepFreeze(setCurrentPlayer(store, 'chris'));
    store = deepFreeze(advancePlayer(store));
    expect(store.currentPlayerKey).toBe('ogion');
    expect(getPlayer(store, 'ogion')?.turn).toBe(true);

    store = deepFreeze(advancePlayer(store));
    expect(store.currentPlayerKey).toBe('dealer');

    store = deepFreeze(advancePlayer(store));
    expect(store.currentPlayerKey).toBe('chris');
    expect(getPlayer(store, 'chris')?.turn).toBe(true);

    const empty = deepFreeze(createPlayerStore());
    expect(advancePlayer(empty)).toBe(empty);
  });

  it('supports updatePlayer with structural sharing and no-op identity return', () => {
    const store = seated();
    expect(updatePlayer(store, 'missing', (p) => ({ ...p, bank: 0 }))).toBe(store);
    expect(updatePlayer(store, 'chris', (p) => p)).toBe(store);

    const updated = updatePlayer(store, 'chris', (p) => ({ ...p, bank: 200 }));
    expect(getPlayer(updated, 'chris')?.bank).toBe(200);
    expect(updated.players.ogion).toBe(store.players.ogion);
    expect(updated.players.dealer).toBe(store.players.dealer);
  });

  it('clears round state on reset while keeping bank, stats, losing streak, and sitting-out flag', () => {
    let store = seated();
    store = antePlayer(store, 'chris', 25).store;
    store = updatePlayer(store, 'chris', (p) => ({
      ...p,
      lossStreak: 2,
      result: 'loss',
      net: -25,
      isBusted: true,
      isFinished: true,
      isSittingOut: true,
      totalBet: 25,
    }));
    store = updatePlayerStats(store, 'chris', frame({ numberOfGamesPlayed: 1, numberOfGamesLost: 1 }));
    store = setCurrentPlayer(store, 'dealer');
    store = { ...store, lastWriteTime: '2026-11-20T00:00:00.000Z' };

    const reset = resetPlayers(deepFreeze(store));
    expect(reset.currentPlayerKey).toBe('chris');
    expect(reset.lastWriteTime).toBe('2026-11-20T00:00:00.000Z');
    const chris = getPlayer(reset, 'chris')!;
    expect(chris).toMatchObject({
      bank: 75,
      lossStreak: 2,
      isBusted: false,
      isFinished: false,
      totalBet: 0,
      isSittingOut: true,
    });
    expect(chris.result).toBeUndefined();
    expect(chris.net).toBeUndefined();
    expect(chris.stats).toMatchObject({ numberOfGamesPlayed: 1, numberOfGamesLost: 1 });
    expect(getPlayer(reset, 'ogion')?.role).toBe('bot');
    expect('isSittingOut' in getPlayer(reset, 'ogion')!).toBe(false);

    const singleReset = resetPlayer(deepFreeze(chris));
    expect(singleReset).toMatchObject({ bank: 75, lossStreak: 2, isSittingOut: true });

    const emptyReset = resetPlayers(deepFreeze(createPlayerStore()));
    expect(emptyReset.currentPlayerKey).toBeUndefined();
  });

  it('accumulates stats and computes winLossRatio without mutating previous stats', () => {
    const store = seated();
    const first = updatePlayerStats(
      store,
      'chris',
      frame({ numberOfGamesPlayed: 3, numberOfGamesWon: 2, numberOfGamesLost: 1, netResult: 50, winLossRatio: 99 }),
    );
    expect(getPlayer(first, 'chris')?.stats).toMatchObject({
      numberOfGamesPlayed: 3,
      numberOfGamesWon: 2,
      numberOfGamesLost: 1,
      netResult: 50,
      winLossRatio: 2,
    });
    expect(getPlayer(store, 'chris')?.stats.numberOfGamesPlayed).toBe(0);

    const second = updatePlayerStats(deepFreeze(first), 'chris', frame({ numberOfGamesLost: 3, netResult: -75 }));
    expect(getPlayer(second, 'chris')?.stats).toMatchObject({
      numberOfGamesLost: 4,
      netResult: -25,
      winLossRatio: 0.5,
    });

    // with no wins or no losses yet, each counts as one
    expect(calculateWinLossRatio(getPlayer(second, 'ogion')!.stats)).toBe(1);
    expect(calculateWinLossRatio(frame({ numberOfGamesWon: 4, numberOfGamesLost: 0 }))).toBe(4);
    expect(calculateWinLossRatio(frame({ numberOfGamesWon: 0, numberOfGamesLost: 4 }))).toBe(0.25);
  });

  it('replaces the roster in order, keeping continuing seats and clearing departed currentPlayerKey', () => {
    let store = seated();
    store = payoutPlayer(store, 'chris', 50);
    store = setCurrentPlayer(store, 'ogion');
    store = { ...store, lastWriteTime: '2026-11-20T12:00:00.000Z' };
    const frozen = deepFreeze(store);

    const replaced = replaceRoster(frozen, [
      { key: 'shevek', title: 'Shevek', isNPC: true, role: 'bot', id: 4, bank: 900 },
      { key: 'chris', title: 'Chris', isNPC: false, id: 1, bank: 1000 },
      { key: 'dealer', title: 'Faxe', isNPC: true, id: 3, bank: 1000 },
    ]);

    expect(activePlayerKeys(replaced)).toEqual(['shevek', 'chris', 'dealer']);
    expect(replaced.players.chris).toBe(frozen.players.chris);
    expect(getPlayer(replaced, 'chris')?.bank).toBe(150);
    expect(getPlayer(replaced, 'ogion')).toBeUndefined();
    expect(getPlayer(replaced, 'shevek')).toMatchObject({ title: 'Shevek', bank: 900, role: 'bot' });
    expect(replaced.currentPlayerKey).toBeUndefined();
    expect(replaced.lastWriteTime).toBe('2026-11-20T12:00:00.000Z');

    const keptCurrent = replaceRoster(frozen, [
      { key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', id: 2, bank: 100 },
      { key: 'dealer', title: 'Faxe', isNPC: true, id: 3, bank: 1000 },
    ]);
    expect(keptCurrent.currentPlayerKey).toBe('ogion');
  });
});
