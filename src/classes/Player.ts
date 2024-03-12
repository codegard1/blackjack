import { PlayerKey, PlayerHandValue, PlayerHand, PlayerStats, PlayerStatsKey } from '../types';
import { IPlayer } from '../interfaces/IPlayer';
import { PlayingCard } from '.';
import { PlayerAction } from '../enums/PlayerAction';
import { PlayerStatus } from '../enums/PlayerStatus';

export class Player implements IPlayer {
  public bank = 0;
  public bet = 0;
  public hand: PlayerHand;
  public id: number;
  public isFinished = false;
  public isNPC: boolean;
  public isSelected = false;
  public isStaying = false;
  public key: PlayerKey;
  public lastAction = PlayerAction.Init;
  public title: string;
  public turn = false;
  public stats: PlayerStats;

  constructor(key: PlayerKey, title: string, isNPC: boolean, id?: number, bank?: number, bet?: number) {
    this.id = id ? id : 0;
    this.bank = bank ? bank : 0;
    this.bet = bet ? bet : 0;
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

}
