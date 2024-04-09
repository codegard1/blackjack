import { PlayerAction, PlayerStatus } from '../enums';
import { handValue } from '../functions';
import { IPlayer, IPlayerOptions, IPlayerState } from '../interfaces';
import { PlayerHandValue, PlayerKey, PlayerStats, PlayingCardKey } from '../types';


/**
 * A Player object keeps track of gold, cards, and statistics across multiple games
 */
export class Player implements IPlayer, IPlayerState {
  // Hard properties 
  public readonly disabled: boolean;
  public readonly id: number;
  public readonly isNPC: boolean;
  public readonly key: PlayerKey;
  public readonly title: string;

  // Soft properties
  public bank = 0;
  public hand: PlayingCardKey[] = [];
  public isFinished = false;
  public isSelected = false;
  public isStaying = false;
  public lastAction = PlayerAction.Init;
  public lastAnte = 0;
  public lastBet = 0;
  public stats: PlayerStats;
  public totalBet = 0;
  public turn = false;

  // CONSTRUCTOR
  constructor(options: IPlayerOptions) {
    this.id = options.id;
    this.key = options.key;
    this.isNPC = options.isNPC;
    this.title = options.title;
    this.disabled = options.disabled ? options.disabled : false;

    this.bank = options.bank ? options.bank : 0;
    this.hand = [];
    this.stats = {
      numberOfGamesLost: 0,
      numberOfGamesPlayed: 0,
      numberOfGamesWon: 0,
      numberOfTimesBlackjack: 0,
      numberOfTimesBusted: 0,
      totalWinnings: 0,
      winLossRatio: 1,
    }
  }

  /**
   * return the win/loss ratio as a string
   * @returns 
   */
  public calculateWinLossRatio(): number {
    const { numberOfGamesWon, numberOfGamesLost } = this.stats;
    const numerator = numberOfGamesWon > 0 ? numberOfGamesWon : 1;
    const denominator = numberOfGamesLost > 0 ? numberOfGamesLost : 1;
    const ratio = (numerator / denominator);
    this.stats.winLossRatio = ratio;
    return ratio;
  }

  /**
   * update stats for a given player
   * @param statsFrame 
   */
  public updateStats(statsFrame: PlayerStats) {
    for (const key in statsFrame) {
      /* add the value of stasFrame[key] to the corresponding key in statsstore */
      if (this.stats[key]) this.stats[key] += statsFrame[key];
    }
    /* recalculate win/loss ratio */
    this.calculateWinLossRatio();
  }

  /**
   * Check if the player bank has more than a certain amount
   * @param amount 
   * @returns true if the player bank has enough gold
   */
  private checkBank(amount: number): boolean {
    return this.bank >= amount;
  }

  public ante(amount: number): boolean {
    // fail if the player does not have enough gold
    if (!this.checkBank(amount)) return false
    else {
      this.lastAnte = amount;
      this.bank -= amount;
      return true;
    }
  }

  public bet(amount: number): boolean {
    // fail if the player does not have enough gold
    if (!this.checkBank(amount)) return false
    else {
      this.lastBet = amount;
      this.totalBet += amount;
      this.bank -= amount;
      return true;
    }
  }

  /**
   * Return the internal state of the player
   */
  public get state(): IPlayerState {
    return {
      bank: this.bank,
      disabled: this.disabled,
      hand: this.hand,
      handValue: this.handValue,
      hasBlackjack: this.hasBlackjack,
      id: this.id,
      isBusted: this.isBusted,
      isFinished: this.isFinished,
      isNPC: this.isNPC,
      isSelected: this.isSelected,
      isStaying: this.isStaying,
      key: this.key,
      lastAction: this.lastAction,
      lastAnte: this.lastAnte,
      lastBet: this.lastBet,
      stats: this.stats,
      status: this.status,
      title: this.title,
      totalBet: this.totalBet,
      turn: this.turn,
    }
  }

  /**
   * Set the internal state of the player
   */
  public set state(newState: IPlayerState) {
    this.bank = newState.bank ? newState.bank : this.bank;
    this.hand = newState.hand ? newState.hand : this.hand;
    this.lastAction = newState.lastAction ? newState.lastAction : this.lastAction;
    this.lastAnte = newState.lastAnte ? newState.lastAnte : this.lastAnte;
    this.lastBet = newState.lastBet ? newState.lastBet : this.lastBet;
    this.stats = newState.stats ? newState.stats : this.stats;
    this.totalBet = newState.totalBet ? newState.totalBet : this.totalBet;
    this.turn = newState.turn ? newState.turn : this.turn;
  }

  /**
   * Return the player's hand as an array of PlayingCard
   */
  public get cards(): PlayingCardKey[] {
    return this.hand;
  }

  /**
   * Set the player's hand to the specified cards
   */
  public set cards(v: PlayingCardKey[]) {
    this.hand = v;
  }

  /**
   * Return true if the player's hand is worth 21 points
   */
  public get hasBlackjack(): boolean {
    return this.handValue.aceAsEleven === 31 || this.handValue.aceAsOne === 31;
  }

  /**
   * Return true if the player's hand is worth more than 21 points
   */
  public get isBusted(): boolean {
    return this.handValue.aceAsEleven > 21 && this.handValue.aceAsOne > 21;
  }

  /**
   * Calculate the player's hand value and return it
   */
  public get handValue(): PlayerHandValue {
    return handValue(this.hand);
  }

  /**
   * Return the highest value of ther player's hand
   */
  public get highestValue(): number {
    return this.handValue.highest;
  }

  /**
   * Return the player status (OK or Busted)
   */
  public get status(): PlayerStatus {
    return this.isBusted ? PlayerStatus.Busted : PlayerStatus.OK;
  }

}
