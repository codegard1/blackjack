/* IndexedDB State Manager */
import { State } from '../../../lib/State';

// custom stuff
import DeckStore from "./DeckStore";
import StatsStore from "./StatsStore";
import { defaultPlayersObj, } from "../definitions";
import { PlayerKey } from '../types';
import { PlayerCollection } from '../types/PlayerCollection';
import { IPlayerStore } from '../interfaces/IPlayerStore';
import { Player } from '../classes/Player';
import { PlayerAction } from '../types/PlayerAction';

/* Data, Getter method, Event Notifier */
const CHANGE_EVENT = "PlayerStore";
const STORE_NAME = "PlayerStore";

export interface IPlayerStoreState {
  private players: PlayerCollection;
  private activePlayerKeys: PlayerKey[];
  private currentPlayerKey: null | PlayerKey;
  private lastWriteTime: string;
}

export class PlayerStore implements IPlayerStore {
  private players: PlayerCollection = {};
  private activePlayerKeys: PlayerKey[] = [];
  private currentPlayerKey = null;
  private lastWriteTime = '';

  constructor() {
    this.initialize();
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

  public newPlayer(key: PlayerKey, title: string, isNPC: boolean, id?: number, bank?: number, bet?: number): void {
    // Create new player record
    const _newPlayer = new Player(key, title, isNPC, id, bank, bet);

    // Add the new Player to the players collection
    if (!(key in this.players)) this.players[key] = _newPlayer;

    // add new player to the active players list
    if (!(key in this.activePlayerKeys)) this.activePlayerKeys.push(key);
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
  public player(key: PlayerKey): Player { return this.players[key] }

  /**
 * Get all active players
 */
  public get all(): Player[] {
    return this.activePlayerKeys.map(key => this.players[key]);
  }

  /**
 * Return the name of the given player
 * @param {string} key key of the player to look up
 */
  public get playerName(key: PlayerKey): string {
    return this.player(key).title;
  }

  public get length(): number {
    return this.activePlayerKeys.length;
  }

  /**
 * reset gameplay variables for each player and set the current player key to the first in the list
 */
  public reset(): void {
    this.activePlayerKeys.forEach(key => this._resetPlayer(key));
    this.currentPlayerKey = this.length > 0 ? this.activePlayerKeys[0] : null;
  }

  /**
 * Start a new round within the same game. reset all game vars per player except 'bank'
 */
  public newRound() {
    this.activePlayerKeys.forEach(key => this._resetPlayer(key, "bank"));
    this.currentPlayerKey = this.state.activePlayerKeys[0];
    this._allPlayersAnte();
    this._startTurn(this.currentPlayerKey);
  }

  /**
 * reset properties that are bound to a single round of play
 * @param {string} key
 * @param  {...string} omit properties to omit when resetting
 */
  public _resetPlayer(key: PlayerKey, omit: string) {
    const props = ["bet", "bank", "handValue", "hasBlackjack", "isBusted", "isFinished", "isStaying", "lastAction", "status", "turn"];
    props.forEach(prop => {
      if (prop !== omit) {
        this.state.players[key][prop] = this.defaultPlayerState[prop]
      }
    })
  }

  /**
   * cause the given player to bet the given amount (unused)
   * @param {string} key
   * @param {number} amount 
   */
  public _bet(key: PlayerKey, amount: number) {
    let p = this.player(key);
    // p.pot -= amount;
    p.bet = amount;
    p.lastAction = PlayerAction.Bet;
    console.log(`${p.title} bet ${amount}`);
  }

  /**
   * cause the given player to ante the given amount
   * @param {string} key
   * @param {number} amount 
   */
  public _ante(key: PlayerKey, amount: number) {
    let p = this.player(key);
    p.bank -= amount;
    p.lastAction = PlayerAction.Ante;
    console.log(`${p.title} ante ${amount}`);
  }

  /**
 * cause all players to ante
 * @param {number} amount 
 */
  public _allPlayersAnte(amount: number) {
    this.activePlayerKeys.forEach(key => this._ante(key, amount))
  }

  /**
 * cause the given player to hit
 * @param {PlayerKey} key
 */
  public _hit(key: PlayerKey) {
    let p = this.player(key);
    p.lastAction = PlayerAction.Hit;
    console.log(`${p.title} hit`);
  }

  // cause the given player to become busted
  /**
   * 
   * @param {string} key the key of the player to fetch
   */
  public _bust(key: PlayerKey) {
    let p = this.player(key);
    p.status = 'busted';
    this._finish(key);
    console.log(`${p.title} busted`);
  }


  /**
 * cause the given player to stay
 * @param {string} key
 */
  public _stay(key: PlayerKey) {
    let p = this.player(key);
    p.isStaying = true;
    p.lastAction = PlayerAction.Stand;
    this._finish(key);
    console.log(`${p.title} stayed`);
  }

  /**
 * when finished, the player can not perform any further actions
 * @param {string} key
 */
  public _finish(key: PlayerKey) {
    let p = this.player(key);
    p.isFinished = true;
    this._endTurn(key);
    console.log(`${p.title} finished`);
  }

  /**
 * cause all players to finish
 */
  public _allPlayersFinish() {
    this.activePlayerKeys.forEach(
      key => this._finish(this.state.players[key])
    )
  }

  /**
 * cause the given player to have blackjack
 * @param {string} key
 */
  public _blackjack(key: PlayerKey): boolean {
    let p = this.player(key);
    console.log(`${p.title} blackjack : ${p.hasBlackjack}`);
    return p.hasBlackjack
  }

  /**
 * cause the given player to start their turn
 * @param {string} key
 */
  public _startTurn(key: PlayerKey) {
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
  public _endTurn(key: PlayerKey) {
    let p = this.player(key);
    p.turn = false;
    p.lastAction = PlayerAction.EndTurn;
    console.log(`${p.title} ended turn`);
  }

  /**
 * cycle currentPlayerKey
 */
  public _nextPlayer() {
    // get key of current Player from state
    const { currentPlayerKey, activePlayerKeys } = this.state;

    // get index of current player in the activePlayers list
    const index = activePlayerKeys.findIndex(key => key === currentPlayerKey);

    // increment the index or go back to 0
    let nextIndex = index + 1 >= (this.length)
      ? 0
      : index + 1;
    this.state.currentPlayerKey = activePlayers[nextIndex];
    this._startTurn(this.currentPlayerKey);
  }

  /**
   * calculate status for the given player
   * @param {string} key
   */
  public _setStatus(key: PlayerKey) {
    let p = this.player(key);

    /*   set busted status  */
    if (p.handValue.aceAsOne > 21 && p.handValue.aceAsEleven > 21) {
      this._bust(key);

    } else if (
      /*   set blackjack status  */
      p.handValue.aceAsOne === 21 ||
      p.handValue.aceAsEleven === 21
    ) {
      this._blackjack(key);
    }
  }

  /**
 * return the highest possible hand value for the given player
 * @param {string} key
 */
  public _getHigherHandValue(key: PlayerKey) {
    let p = this.player(key);

    let higherHandValue = p.handValue.aceAsOne > p.handValue.aceAsEleven
      ? p.handValue.aceAsOne
      : p.handValue.aceAsEleven;
    return higherHandValue;
  }

  /**
 * add the given amount to the given player's bank
 * @param {string} key
 * @param {number} amount 
 */
  public _payout(key: PlayerKey, amount: number) {
    let p = this.player(key);
    p.bank += amount;
  }

  public get currentPlayer() {
    return null === this.currentPlayerKey ? null : this.players[this.currentPlayerKey];
  }

  // return true if the current player is an NPC
  public get _isCurrentPlayerNPC() {
    return null === this.currentPlayer ? null : this.currentPlayer.isNPC;
  }

  /**
 * set players' status, hand values
 */
  _evaluatePlayers() {
    this.activePlayerKeys.forEach(key => {
      this.state.players[key].handValue = DeckStore.getHandValue(key);
      this._setStatus(key);
    });

    let anyPlayerisBusted, allPlayersStaying;
    for (let key in this.state.players) {
      if (key in this.state.activePlayers) {
        anyPlayerisBusted = this.state.players[key].isBusted;
        allPlayersStaying = this.state.players[key].isStaying;
      }
    }

    const nextGameStatus = anyPlayerisBusted || allPlayersStaying ? 5 : 1;

    if (nextGameStatus > 2) {
      for (let key in this.state.players) {
        if (key in this.activePlayerKeys) {

          StatsStore.update(key, {
            numberOfGamesLost: (key === this.state.loser ? 1 : 0),
            numberOfGamesPlayed: 1,
            numberOfGamesWon: (key === this.state.winner ? 1 : 0),
            numberOfTimesBlackjack: (this.state.players[key].hasBlackJack ? 1 : 0),
            numberOfTimesBusted: (this.state.players[key].isBusted ? 1 : 0),
            totalWinnings: (key === this.state.winner ? this.state.pot : 0)
          });

        }
      }
    }
  }
}


// IndexedDB 
/*
stateManager: new State([STORE_NAME], (name, value) => {
  console.log(`${name} was updated`);
})
*/



/*
AppDispatcher.register(action => {

  switch (action.actionType) {
    case AppConstants.INITIALIZE_STORES:
      PlayerStore.initialize().then(() => {
        PlayerStore.emitChange();
      });
      break;

    case AppConstants.CLEAR_STORES:
      PlayerStore.clearStore();
      break;

    case AppConstants.GLOBAL_NEWPLAYER:
      PlayerStore.newPlayer(action.key, action.title, action.isNPC);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_RESET:
      PlayerStore.reset();
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_NEWROUND:
      PlayerStore.newRound();
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_DEAL:
      PlayerStore._startTurn(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_HIT:
      PlayerStore._hit(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_STAY:
      PlayerStore._stay(PlayerStore.state.currentPlayerKey);
      PlayerStore.emitChange();
      break;

    case AppConstants.GAME_BET:
      PlayerStore._bet(PlayerStore.state.currentPlayerKey, action.amount);
      PlayerStore.emitChange();
      break;

    case AppConstants.GLOBAL_EVALUATEGAME:
      PlayerStore._evaluatePlayers();
      // PlayerStore.emitChange();
      break;

    case AppConstants.GLOBAL_ENDGAME:
      PlayerStore._allPlayersFinish();
      PlayerStore.emitChange();
      break;
*/
