import { playerDefaults } from './definitions';
import { PlayerAction } from '../../shared';
import { IPlayer } from '../../shared/IPlayer';
import { IPlayerOptions } from '../../shared/IPlayerOpts';
import { IPlayerStoreState } from '../../shared/IPlayerStore';
import { PlayerCollection, PlayerKey, PlayerStats } from '../../shared';

/**
 * Create an empty player store or a defensive plain copy of an existing state.
 * Each player and its stats object are shallow-copied so the result shares no mutable references with `initial`.
 * @param initial - Existing store state to copy; omit to create an empty store
 * @returns A new player store state
 */
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

/**
 * Build a fresh seat record from options with default round flags and cloned stats.
 * The role defaults to `dealer` for NPCs and `human` otherwise.
 * @param options - Seat configuration; optional fields are only set when provided
 * @returns A new player record
 */
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

/**
 * Seated player keys in seating order.
 * @param store - Player store to read
 * @returns Keys of all seated players
 */
export function activePlayerKeys(store: IPlayerStoreState): PlayerKey[] {
  return Object.values(store.players).map((player) => player.key);
}

/**
 * Seated players in seating order.
 * @param store - Player store to read
 * @returns All seated players
 */
export function allPlayers(store: IPlayerStoreState): IPlayer[] {
  return Object.values(store.players);
}

/**
 * Look up a player by key.
 * @param store - Player store to read
 * @param key - Key of the seat to find
 * @returns The matching player, or `undefined` if no such seat exists
 */
export function getPlayer(store: IPlayerStoreState, key: PlayerKey): IPlayer | undefined {
  return store.players[key];
}

/**
 * Number of seated players.
 * @param store - Player store to read
 * @returns Count of seated players
 */
export function playerCount(store: IPlayerStoreState): number {
  return Object.keys(store.players).length;
}

/**
 * Currently active player, if any.
 * @param store - Player store to read
 * @returns The player at `currentPlayerKey`, or `undefined` if none is active
 */
export function currentPlayer(store: IPlayerStoreState): IPlayer | undefined {
  return store.currentPlayerKey !== undefined ? store.players[store.currentPlayerKey] : undefined;
}

/**
 * Serializable snapshot of the player store for persistence and sync.
 * The `players` record is shared by reference, not copied.
 * @param store - Player store to snapshot
 * @returns Store state including the derived `activePlayerKeys` list
 */
export function playerStoreSnapshot(store: IPlayerStoreState): IPlayerStoreState {
  return {
    players: store.players,
    activePlayerKeys: activePlayerKeys(store),
    currentPlayerKey: store.currentPlayerKey,
    lastWriteTime: store.lastWriteTime,
  };
}

/**
 * Seat a new player if their key is not already present.
 * @param store - Current player store
 * @param options - Configuration for the new seat
 * @returns A new store with the player added, or `store` unchanged if the key is taken
 */
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

/**
 * Return a new store with one seat transformed, preserving references for untouched seats.
 * @param store - Current player store
 * @param key - Key of the seat to update
 * @param updater - Pure function mapping the existing player to its replacement
 * @returns A new store, or `store` unchanged if the seat is missing or `updater` returns the same object
 */
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

/**
 * Clear round-bound fields from a player while keeping bank, stats, and sitting-out status.
 * @param player - Player to reset
 * @returns A new player with round state restored to defaults
 */
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

/**
 * Reset round-bound fields across all seated players and point currentPlayerKey to the first seat.
 * @param store - Current player store
 * @returns A new store with every player reset; `currentPlayerKey` is `undefined` if no one is seated
 */
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

/**
 * Collect an ante from a player if their bank covers it.
 * @param store - Current player store
 * @param key - Key of the paying seat
 * @param amount - Ante amount to deduct
 * @returns The resulting store and whether the ante was paid; the store is unchanged when `paid` is `false`
 */
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

/**
 * Deduct a wager from a player's bank if they can cover it.
 * @param store - Current player store
 * @param key - Key of the betting seat
 * @param amount - Wager amount to deduct
 * @returns The resulting store and whether the bet was placed; the store is unchanged when `paid` is `false`
 */
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

/**
 * Record a hit action on a player.
 * @param store - Current player store
 * @param key - Key of the hitting seat
 * @returns A new store with the player's `lastAction` set to Hit
 */
export function hitPlayer(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({ ...p, lastAction: PlayerAction.Hit }));
}

/**
 * Add an amount to a player's bank.
 * @param store - Current player store
 * @param key - Key of the seat being paid
 * @param amount - Amount to add to the bank
 * @returns A new store with the updated bank
 */
export function payoutPlayer(store: IPlayerStoreState, key: PlayerKey, amount: number): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({ ...p, bank: p.bank + amount }));
}

/**
 * Mark the start of a player's turn.
 * @param store - Current player store
 * @param key - Key of the seat whose turn begins
 * @returns A new store with the player's turn flag set and `isFinished` cleared
 */
export function startPlayerTurn(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({
    ...p,
    turn: true,
    isFinished: false,
    lastAction: PlayerAction.StartTurn,
  }));
}

/**
 * Mark the end of a player's turn.
 * @param store - Current player store
 * @param key - Key of the seat whose turn ends
 * @returns A new store with the player's turn flag cleared
 */
export function endPlayerTurn(store: IPlayerStoreState, key: PlayerKey): IPlayerStoreState {
  return updatePlayer(store, key, (p) => ({
    ...p,
    turn: false,
    lastAction: PlayerAction.EndTurn,
  }));
}

/**
 * Set which seat is currently active.
 * @param store - Current player store
 * @param key - Key of the seat to activate, or `undefined` to clear it
 * @returns A new store, or `store` unchanged if `key` is already current
 */
export function setCurrentPlayer(store: IPlayerStoreState, key: PlayerKey | undefined): IPlayerStoreState {
  if (store.currentPlayerKey === key) return store;
  return {
    ...store,
    currentPlayerKey: key,
  };
}

/**
 * Cycle currentPlayerKey to the next seat and start their turn, wrapping to the first seat after the last.
 * @param store - Current player store
 * @returns A new store with the next player active, or `store` unchanged if no one is seated
 */
export function advancePlayer(store: IPlayerStoreState): IPlayerStoreState {
  const keys = activePlayerKeys(store);
  if (keys.length === 0) return store;
  const index = keys.findIndex((key) => key === store.currentPlayerKey);
  const nextIndex = index + 1 >= keys.length ? 0 : index + 1;
  const nextKey = keys[nextIndex];
  return startPlayerTurn({ ...store, currentPlayerKey: nextKey }, nextKey);
}

/**
 * Calculate win/loss ratio, treating zero wins or losses as 1.
 * @param stats - Player stats containing `numberOfGamesWon` and `numberOfGamesLost`
 * @returns Wins divided by losses
 */
export function calculateWinLossRatio(stats: PlayerStats): number {
  const numerator = stats.numberOfGamesWon > 0 ? stats.numberOfGamesWon : 1;
  const denominator = stats.numberOfGamesLost > 0 ? stats.numberOfGamesLost : 1;
  return numerator / denominator;
}

/**
 * Accumulate a stats delta onto a player and recompute winLossRatio.
 * Any `winLossRatio` in the delta is ignored.
 * @param store - Current player store
 * @param key - Key of the seat whose stats change
 * @param statsFrame - Stat increments to add to the existing totals
 * @returns A new store with the updated stats
 */
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

/**
 * Seat a new roster in order, keeping existing seats and dropping departed ones.
 * @param store - Current player store
 * @param seats - Desired seats in seating order
 * @returns A new store containing only the listed seats; `currentPlayerKey` is cleared if that seat left
 */
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
