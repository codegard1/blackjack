import { playerDefaults } from '../definitions';
import { PlayerAction } from '../enums';
import { IPlayer, IPlayerOptions, IPlayerStoreState } from '../interfaces';
import { PlayerCollection, PlayerKey, PlayerStats } from '../types';

/** Create an empty player store or a defensive plain copy of an existing state */
export function createPlayerStore(initial?: IPlayerStoreState): IPlayerStoreState {
  if (!initial) {
    return {
      players: {},
      currentPlayerKey: undefined,
      lastWriteTime: '',
    };
  }
  const players: PlayerCollection = Object.fromEntries(
    Object.entries(initial.players).map(([key, player]) => [
      key,
      { ...player, stats: { ...player.stats } },
    ]),
  );
  return {
    players,
    currentPlayerKey: initial.currentPlayerKey,
    lastWriteTime: initial.lastWriteTime ?? '',
  };
}

/** Build a fresh seat record from options with default round flags and cloned stats */
export function createPlayer(options: IPlayerOptions): IPlayer {
  const { key, title, isNPC, id, bank, disabled, stats, isSittingOut, awayTask, isReadyToReturn } = options;
  const role = options.role ?? (isNPC ? 'dealer' : 'human');
  return {
    ...playerDefaults,
    key,
    title,
    isNPC,
    id,
    bank,
    role,
    disabled: disabled ? disabled : false,
    stats: { ...playerDefaults.stats, ...stats },
    ...(isSittingOut !== undefined ? { isSittingOut } : {}),
    ...(awayTask !== undefined ? { awayTask } : {}),
    ...(isReadyToReturn !== undefined ? { isReadyToReturn } : {}),
  };
}

/** Seated player keys in seating order */
export function activePlayerKeys(store: IPlayerStoreState): PlayerKey[] {
  return Object.values(store.players).map((player) => player.key);
}

/** Seated players in seating order */
export function allPlayers(store: IPlayerStoreState): IPlayer[] {
  return Object.values(store.players);
}

/** Look up a player by key */
export function getPlayer(store: IPlayerStoreState, key: PlayerKey): IPlayer | undefined {
  return store.players[key];
}

/** Number of seated players */
export function playerCount(store: IPlayerStoreState): number {
  return Object.keys(store.players).length;
}

/** Currently active player, if any */
export function currentPlayer(store: IPlayerStoreState): IPlayer | undefined {
  return store.currentPlayerKey !== undefined ? store.players[store.currentPlayerKey] : undefined;
}

/** Serializable snapshot of the player store for persistence and sync */
export function playerStoreSnapshot(store: IPlayerStoreState): IPlayerStoreState {
  return {
    players: store.players,
    activePlayerKeys: activePlayerKeys(store),
    currentPlayerKey: store.currentPlayerKey,
    lastWriteTime: store.lastWriteTime,
  };
}

/** Seat a new player if their key is not already present */
export function addPlayer(store: IPlayerStoreState, options: IPlayerOptions): IPlayerStoreState {
  if (options.key in store.players) return store;
  return {
    ...store,
    players: {
      ...store.players,
      [options.key]: createPlayer(options),
    },
  };
}

/** Return a new store with one seat transformed, preserving references for untouched seats */
export function updatePlayer(
  store: IPlayerStoreState,
  key: PlayerKey,
  updater: (player: IPlayer) => IPlayer,
): IPlayerStoreState {
  const existing = store.players[key];
  if (!existing) return store;
  const updated = updater(existing);
  if (updated === existing) return store;
  return {
    ...store,
    players: {
      ...store.players,
      [key]: updated,
    },
  };
}

/** Clear round-bound fields from a player while keeping bank, stats, and sitting-out status */
export function resetPlayer(player: IPlayer): IPlayer {
  return {
    ...playerDefaults,
    key: player.key,
    title: player.title,
    isNPC: player.isNPC,
    role: player.role,
    bank: player.bank,
    id: player.id,
    lossStreak: player.lossStreak,
    stats: { ...player.stats },
    ...(player.isSittingOut ? { isSittingOut: true } : {}),
  };
}

/** Reset round-bound fields across all seated players and point currentPlayerKey to the first seat */
export function resetPlayers(store: IPlayerStoreState): IPlayerStoreState {
  const keys = activePlayerKeys(store);
  const players: PlayerCollection = Object.fromEntries(
    Object.entries(store.players).map(([key, player]) => [key, resetPlayer(player)]),
  );
  return {
    ...store,
    players,
    currentPlayerKey: keys.length > 0 ? keys[0] : undefined,
  };
}

/** Collect an ante from a player if their bank covers it */
export function antePlayer(
  store: IPlayerStoreState,
  key: PlayerKey,
  amount: number,
): { store: IPlayerStoreState; paid: boolean } {
  const player = store.players[key];
  if (!player || player.bank < amount) return { store, paid: false };
  return {
    paid: true,
    store: updatePlayer(store, key, (p) => ({
      ...p,
      bank: p.bank - amount,
      lastAction: PlayerAction.Ante,
      lastAnte: amount,
    })),
  };
}

/** Deduct a wager from a player's bank if they can cover it */
export function betPlayer(
  store: IPlayerStoreState,
  key: PlayerKey,
  amount: number,
): { store: IPlayerStoreState; paid: boolean } {
  const player = store.players[key];
  if (!player || player.bank < amount) return { store, paid: false };
  return {
    paid: true,
    store: updatePlayer(store, key, (p) => ({
      ...p,
      bank: p.bank - amount,
      lastAction: PlayerAction.Bet,
      lastBet: amount,
      totalBet: (p.totalBet ?? 0) + amount,
    })),
  };
}

/** Record a hit action on a player */
export function hitPlayer(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({ ...p, lastAction: PlayerAction.Hit }));
}

/** Add an amount to a player's bank */
export function payoutPlayer(store: IPlayerStoreState, key: PlayerKey, amount: number): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({ ...p, bank: p.bank + amount }));
}

/** Mark the start of a player's turn */
export function startPlayerTurn(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({
    ...p,
    turn: true,
    isFinished: false,
    lastAction: PlayerAction.StartTurn,
  }));
}

/** Mark the end of a player's turn */
export function endPlayerTurn(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({
    ...p,
    turn: false,
    lastAction: PlayerAction.EndTurn,
  }));
}

/** Set which seat is currently active */
export function setCurrentPlayer(store: IPlayerStoreState, key: PlayerKey | undefined): IPlayerStoreState {
  if (store.currentPlayerKey === key) return store;
  return {
    ...store,
    currentPlayerKey: key,
  };
}

/** Cycle currentPlayerKey to the next seat and start their turn */
export function advancePlayer(store: IPlayerStoreState): IPlayerStoreState {
  const keys = activePlayerKeys(store);
  if (keys.length === 0) return store;
  const index = keys.findIndex((key) => key === store.currentPlayerKey);
  const nextIndex = index + 1 >= keys.length ? 0 : index + 1;
  const nextKey = keys[nextIndex];
  return startPlayerTurn({ ...store, currentPlayerKey: nextKey }, nextKey);
}

/** Calculate win/loss ratio, treating zero wins or losses as 1 */
export function calculateWinLossRatio(stats: PlayerStats): number {
  const numerator = stats.numberOfGamesWon > 0 ? stats.numberOfGamesWon : 1;
  const denominator = stats.numberOfGamesLost > 0 ? stats.numberOfGamesLost : 1;
  return numerator / denominator;
}

/** Accumulate a stats delta onto a player and recompute winLossRatio */
export function updatePlayerStats(
  store: IPlayerStoreState,
  key: PlayerKey,
  statsFrame: PlayerStats,
): IPlayerStoreState {
  return updatePlayer(store, key, (player) => {
    const stats: PlayerStats = { ...player.stats };
    for (const [statKey, value] of Object.entries(statsFrame)) {
      if (statKey === 'winLossRatio') continue;
      stats[statKey] = (stats[statKey] ?? 0) + value;
    }
    stats.winLossRatio = calculateWinLossRatio(stats);
    return { ...player, stats };
  });
}

/** Seat a new roster in order, keeping existing seats and dropping departed ones */
export function replaceRoster(store: IPlayerStoreState, seats: IPlayerOptions[]): IPlayerStoreState {
  const players: PlayerCollection = {};
  for (const seat of seats) {
    players[seat.key] = store.players[seat.key] ?? createPlayer(seat);
  }
  const currentPlayerKey = store.currentPlayerKey && players[store.currentPlayerKey]
    ? store.currentPlayerKey
    : undefined;
  return {
    players,
    currentPlayerKey,
    lastWriteTime: store.lastWriteTime,
  };
}
