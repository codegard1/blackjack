// custom stuff
import { PlayerAction } from '../enums';
import { IPlayer, IPlayerOptions, IPlayerStore, IPlayerStoreState } from '../interfaces';
import { PlayerCollection, PlayerKey, PlayerStats } from '../types';
import { handValue } from '../functions';
import { playerDefaults } from '../definitions';

export class PlayerStore implements IPlayerStore {
  private players: PlayerCollection = {};
  private activePlayerKeys: PlayerKey[] = [];
  private currentPlayerKey: PlayerKey | null = null;
  private lastWriteTime = '';

  constructor(playerState?: IPlayerStoreState) {
    if (undefined !== playerState) {
      this.players = playerState.players;
      this.activePlayerKeys = playerState.activePlayerKeys;
      this.currentPlayerKey = playerState.currentPlayerKey;
      this.lastWriteTime = playerState.lastWriteTime;
    }
  }

  /**
   * Return the internal state of the class 
   */
  public get state(): IPlayerStoreState {
    return {
      players: this.players,
      activePlayerKeys: this.activePlayerKeys,
      currentPlayerKey: this.currentPlayerKey,
      lastWriteTime: this.lastWriteTime,
    }
  }


  /**
   * Create a new Player object and add it to the collection in PlayerStore
   * @param options 
   */
  public newPlayer(options: IPlayerOptions): void {
    // Create new player record
    const { key, title, isNPC, id, bank, disabled, } = options;
    const _newPlayer: IPlayer = { ...playerDefaults, key, title, isNPC, id, bank, disabled: disabled ? disabled : false, };
    // Add the new Player to the players collection
    if (!(key in this.players)) this.players[key] = _newPlayer;

    // add new player to the active players list
    const _ap = this.activePlayerKeys.slice();
    if (!(key in _ap)) {
      _ap.push(key);
      this.activePlayerKeys = _ap;
    }
  }

  /**
   * save state to local storage
   */
  public async saveAll(): Promise<void> {
    this.lastWriteTime = new Date().toISOString();
    // this.stateManager.set(STORE_NAME, this.state);
  }

  public clearStore() {
    this.players = {};
    this.saveAll();
  }

  /**
   * Lookup player by key
   * @param {PlayerKey} key
   */
  public player(key: PlayerKey): IPlayer { return this.players[key] }

  /**
   * Return the name of the given player
   * @param {string} key key of the player to look up
   */
  public playerName(key: PlayerKey): string {
    return this.player(key).title;
  }

  public get length(): number {
    return this.activePlayerKeys.length;
  }

  /**
  * Get all active players
  */
  public get all(): IPlayer[] {
    return this.activePlayerKeys.map(key => this.players[key]);
  }

  /**
   * reset gameplay variables for each player and set the current player key to the first in the list
   */
  public reset(): void {
    this.activePlayerKeys.forEach(key => this.resetPlayer(key, 'bank'));
    this.currentPlayerKey = this.length > 0 ? this.activePlayerKeys[0] : null;
  }

  /**
   * Start a new round within the same game. reset all game vars per player except 'bank'
   */
  public newRound() {
    this.activePlayerKeys.forEach(key => this.resetPlayer(key, "bank"));
    this.currentPlayerKey = this.state.activePlayerKeys[0];
    this.allPlayersAnte(20);
    this.startTurn(this.currentPlayerKey);
  }

  /**
   * reset properties that are bound to a single round of play
   * @param {string} key
   * @param  {...string} omit properties to omit when resetting
   */
  public resetPlayer(key: PlayerKey, omit: string) {
    const player = this.players[key];
    player.bank = 1000;
    player.isFinished = false;
    player.isStaying = false;
    player.lastAction = PlayerAction.Init;
    player.turn = false;
  }

  /**
   * Check if the player bank has more than a certain amount
   * @param player
   * @param amount 
   * @returns true if the player bank has enough gold
  */
  private checkBank(player: PlayerKey, amount: number) {
    return this.player(player).bank >= amount;
  }

  /**
   * cause the given player to bet the given amount (unused)
   * @param {string} key
   * @param {number} amount 
   */
  public bet(key: PlayerKey, amount: number) {
    let p = this.player(key);
    if (!this.checkBank(key, amount)) return false
    else {
      p.bank -= amount;
      p.lastAction = PlayerAction.Bet;
      p.lastBet = amount;
      p.totalBet ? p.totalBet += amount : amount;
      console.log(`${p.title} bet ${amount}`);
      return true;
    }
  }

  /**
   * cause the given player to ante the given amount
   * @param {string} key
   * @param {number} amount 
   */
  public ante(key: PlayerKey, amount: number) {
    let p = this.player(key);
    if (!this.checkBank(key, amount)) return false
    else {
      p.bank -= amount;
      p.lastAction = PlayerAction.Ante;
      p.lastAnte = amount;
      console.log(`${p.title} ante ${amount}`);
      return true;
    }
  }

  /**
   * cause all players to ante
   * @param {number} amount 
   */
  public allPlayersAnte(amount: number) {
    this.activePlayerKeys.forEach(key => this.ante(key, amount))
  }

  /**
 * cause the given player to hit
 * @param {PlayerKey} key
 */
  public hit(key: PlayerKey) {
    let p = this.player(key);
    p.lastAction = PlayerAction.Hit;
    console.log(`${p.title} hit`);
  }

  // cause the given player to become busted
  /**
   * 
   * @param {string} key the key of the player to fetch
   */
  public bust(key: PlayerKey) {
    let p = this.playerName(key);
    this.finish(key);
    console.log(`${p} busted`);
  }


  /**
 * cause the given player to stay
 * @param {string} key
 */
  public stay(key: PlayerKey) {
    let p = this.player(key);
    p.isStaying = true;
    p.lastAction = PlayerAction.Stand;
    this.finish(key);
    console.log(`${p.title} stayed`);
  }


  public stats(key: PlayerKey) {
    let p = this.player(key);
    return p.stats;
  }

  /**
 * when finished, the player can not perform any further actions
 * @param {string} key
 */
  public finish(key: PlayerKey) {
    let p = this.player(key);
    p.isFinished = true;
    this.endTurn(key);
    console.log(`${p.title} finished`);
  }

  /**
 * cause all players to finish
 */
  public allPlayersFinish() {
    this.activePlayerKeys.forEach(
      key => this.finish(key)
    )
  }

  /**
 * cause the given player to start their turn
 * @param {string} key
 */
  public startTurn(key: PlayerKey) {
    let p = this.player(key);
    p.turn = true;
    p.isFinished = false;
    p.lastAction = PlayerAction.StartTurn;
    console.log(`${p.title} started turn`);
  }

  /**
 * cause the given player's turn to end
 * @param {string} key
 */
  public endTurn(key: PlayerKey) {
    let p = this.player(key);
    p.turn = false;
    p.lastAction = PlayerAction.EndTurn;
    console.log(`${p.title} ended turn`);
  }

  /**
 * cycle currentPlayerKey
 */
  public nextPlayer() {
    // get key of current Player from state
    const { currentPlayerKey, activePlayerKeys } = this.state;

    // get index of current player in the activePlayers list
    const index = activePlayerKeys.findIndex(key => key === currentPlayerKey);

    // increment the index or go back to 0
    let nextIndex = index + 1 >= (this.length)
      ? 0
      : index + 1;
    this.currentPlayerKey = this.activePlayerKeys[nextIndex];
    this.startTurn(this.currentPlayerKey);
  }

  /**
   * add the given amount to the given player's bank
   * @param {string} key
   * @param {number} amount 
   */
  public payout(key: PlayerKey, amount: number) {
    let p = this.player(key);
    p.bank += amount;
  }

  public get currentPlayer() {
    if (null !== this.currentPlayerKey)
      return this.players[this.currentPlayerKey];
  }

  // return true if the current player is an NPC
  public get isCurrentPlayerNPC() {
    return (this.currentPlayer) ? this.currentPlayer.isNPC : false;
  }

  /**
   * set players' status, hand values
   */
  _evaluatePlayers() {

    let anyPlayerisBusted, allPlayersStaying;
    for (let key in this.players) {
      anyPlayerisBusted = this.players[key].isBusted;
      allPlayersStaying = this.players[key].isStaying;
    }

    const nextGameStatus = anyPlayerisBusted || allPlayersStaying ? 5 : 1;

    if (nextGameStatus > 2) {
      for (let key in this.players) {
        if (key in this.activePlayerKeys) {

          //       StatsStore.update(key, {
          //         numberOfGamesLost: (key === this.state.loser ? 1 : 0),
          //         numberOfGamesPlayed: 1,
          //         numberOfGamesWon: (key === this.state.winner ? 1 : 0),
          //         numberOfTimesBlackjack: (this.state.players[key].hasBlackJack ? 1 : 0),
          //         numberOfTimesBusted: (this.state.players[key].isBusted ? 1 : 0),
          //         totalWinnings: (key === this.state.winner ? this.state.pot : 0)
          //       });

        }
      }
    }
  }

  /**
   * return the win/loss ratio as a string
   * @returns 
   */
  public calculateWinLossRatio(key: PlayerKey): number {
    const p = this.players[key];
    const { numberOfGamesWon, numberOfGamesLost } = p.stats;
    const numerator = numberOfGamesWon > 0 ? numberOfGamesWon : 1;
    const denominator = numberOfGamesLost > 0 ? numberOfGamesLost : 1;
    const ratio = (numerator / denominator);
    p.stats.winLossRatio = ratio;
    return ratio;
  }

  /**
   * update stats for a given player
   * @param statsFrame 
   */
  public updateStats(key: PlayerKey, statsFrame: PlayerStats) {
    const p = this.players[key];
    for (const key in statsFrame) {
      /* add the value of stasFrame[key] to the corresponding key in statsstore */
      if (p.stats[key]) p.stats[key] += statsFrame[key];
    }
    /* recalculate win/loss ratio */
    this.calculateWinLossRatio(key);
  }
}
