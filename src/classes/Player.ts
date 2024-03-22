import { PlayerKey, PlayerHandValue, PlayerHand, PlayerStats, PlayerStatsKey } from '../types';
import { IPlayer, IPlayerState } from '../interfaces';
import { PlayingCard } from '.';
import { PlayerAction } from '../enums/PlayerAction';
import { PlayerStatus } from '../enums/PlayerStatus';

export class Player implements IPlayer {
  public bank = 0;
  public hand: PlayerHand;
  public id: number;
  public isFinished = false;
  public isNPC: boolean;
  public isSelected = false;
  public isStaying = false;
  public key: PlayerKey;
  public lastAction = PlayerAction.Init;
  public lastAnte = 0;
  public lastBet = 0;
  public stats: PlayerStats;
  public title: string;
  public totalBet = 0;
  public turn = false;

  constructor(key: PlayerKey, title: string, isNPC: boolean, id?: number, bank?: number, bet?: number) {
    this.id = id ? id : 0;
    this.bank = bank ? bank : 0;
    this.lastBet = bet ? bet : 0;
    this.totalBet += bet ? bet : 0;
    this.key = key;
    this.title = title;
    this.isNPC = isNPC;
    this.hand = {
      cards: [],
      handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 },
    };
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

  public get cards(): PlayingCard[] {
    return this.hand.cards;
  }

  public set cards(v: PlayingCard[]) {
    this.hand.cards = v;
  }

  public get hasBlackjack(): boolean {
    return this.handValue.aceAsEleven === 31 || this.handValue.aceAsOne === 31;
  }

  public get isBusted(): boolean {
    return this.handValue.aceAsEleven > 31 && this.handValue.aceAsOne > 31;
  }

  public get handValue(): PlayerHandValue {
    return this.hand.handValue;
  }

  public get highestValue(): number {
    return this.hand.handValue.highest;
  }

  public get status(): PlayerStatus {
    return this.isBusted ? PlayerStatus.Busted : PlayerStatus.OK;
  }

  // return the win/loss ratio as a string
  public calculateWinLossRatio(): number {
    const { numberOfGamesWon, numberOfGamesLost } = this.stats;
    const numerator = numberOfGamesWon > 0 ? numberOfGamesWon : 1;
    const denominator = numberOfGamesLost > 0 ? numberOfGamesLost : 1;
    const ratio = (numerator / denominator);
    this.stats.winLossRatio = ratio;
    return ratio;
  }

  // update stats for a given player
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

  public get state(): IPlayerState {
    return {
      bank: this.bank,
      hand: this.hand,
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

  public set state(newState: IPlayerState) {
    this.bank = newState.bank;
    this.hand = newState.hand;
    this.id = newState.id;
    this.isNPC = newState.isNPC;
    this.key = newState.key;
    this.lastAction = newState.lastAction;
    this.lastAnte = newState.lastAnte;
    this.lastBet = newState.lastBet;
    this.stats = newState.stats;
    this.title = newState.title;
    this.totalBet = newState.totalBet;
    this.turn = newState.turn;
  }



}
