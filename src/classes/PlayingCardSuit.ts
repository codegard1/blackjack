import { IPlayingCardSuit } from "../interfaces";
import { Suit, SuitKey } from "../types";

/**
 * All the playing cards in a pack bearing the same symbol
 */
export class PlayingCardSuit implements IPlayingCardSuit {
  public single: Suit;
  public plural: string;
  public short: string;
  public icon: string;

  constructor(single: Suit) {
    this.single = single;
    this.plural = single + 's';
    this.short = single.substring(0, 1).toUpperCase();

    switch (single) {
      case 'Heart':
        this.icon = '\u2665';
        break;

      case 'Spade':
        this.icon = '\u2660';
        break;

      case 'Diamond':
        this.icon = '\u2666';
        break;

      case 'Club':
        this.icon = '\u2663';
        break;

      default:
        this.icon = '\u2612';
        break;
    }
  }

  /**
   * 
   * @returns all suit values as an array of strings
   */
  static suits(): Suit[] {
    return [this.Heart(), this.Club(), this.Spade(), this.Diamond()];
  }

  static Heart(): Suit {
    return 'Heart';
  }
  static Club(): Suit {
    return 'Club';
  }
  static Spade(): Suit {
    return 'Spade';
  }
  static Diamond(): Suit {
    return 'Diamond';
  }
}


