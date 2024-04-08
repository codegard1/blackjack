import { IPlayingCard, IPlayingCardSort, IPlayingCardSuit } from "../interfaces";
import { PlayingCardKey } from "../types";

/**
 * A single playing card
 */
export class PlayingCard implements IPlayingCard {
  public readonly suit: IPlayingCardSuit;
  public readonly description: string;
  public readonly sort: IPlayingCardSort;
  public readonly key: string;

  static cardSuits: { [index: string]: IPlayingCardSuit } = {
    'Heart': {
      single: 'Heart',
      plural: 'Hearts',
      short: 'H',
      icon: '\u2665',
    },
    'Spade': {
      single: 'Spade',
      plural: 'Spades',
      short: 'S',
      icon: '\u2660',
    },
    'Diamond': {
      single: 'Diamond',
      plural: 'Diamonds',
      short: 'D',
      icon: '\u2666',
    },
    'Club': {
      single: 'Club',
      plural: 'Clubs',
      short: 'C',
      icon: '\u2663',
    },
  }

  /**
   * 
   * @param key unique string made up of the suit name, card description, and card sort value joined with '_', e.g. Heart_Five_5 = 5 of Hearts
   */
  constructor(key: PlayingCardKey) {
    this.key = key;
    const [suit, desc, sortValue] = key.split('_');
    this.suit = PlayingCard.cardSuits[suit];
    this.description = desc;
    switch (sortValue) {
      case '11':
        this.sort = {
          name: 'J',
          value: Number(key.split('_')[2]),
        }
        break;
      case '12':
        this.sort = {
          name: 'Q',
          value: Number(key.split('_')[2]),
        }
        break;
      case '13':
        this.sort = {
          name: 'K',
          value: Number(key.split('_')[2]),
        }
        break;
      case '14':
        this.sort = {
          name: 'A',
          value: Number(key.split('_')[2]),
        }
        break;
      default:
        this.sort = {
          name: key.split('_')[2],
          value: Number(key.split('_')[2]),
        }
    }
  }

  public toString() {
    return this.description + " of " + this.suit.plural;
  }

  public toShortDisplayString() {
    var suit = this.suit.short;
    var value;

    return value + suit;
  }

  public get value(): string {
    return this.toString();
  }

}
