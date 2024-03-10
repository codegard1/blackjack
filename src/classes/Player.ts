import { PlayerKey, PlayerHandValue, PlayerHand } from '../types';
import { IPlayer } from '../interfaces/IPlayer';
import { PlayerAction } from '../types/PlayerAction';
import { PlayingCard } from '.';



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
  public status = 'ok';
  public title: string;
  public turn = false;

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
      hasBlackjack: false,
      isBusted: false,
    };
  }

  public get cards(): PlayingCard[] {
    return this.hand.cards;
  }

  public set cards(v: PlayingCard[]) {
    this.hand.cards = v;
  }

  public get hasBlackjack(): boolean {
    return this.hand.hasBlackjack;
  }

  public get isBusted(): boolean {
    return this.hand.isBusted;
  }

  public get handValue(): PlayerHandValue {
    return this.hand.handValue;
  }

  public get highestValue(): number {
    return this.hand.handValue.highest;
  }

}
