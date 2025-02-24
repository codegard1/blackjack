import { CardTuple } from "../enums";
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

  /**
   * Static object containing predefined objects for each Card suit
   */
  static cardSuits: { [index: string]: IPlayingCardSuit } = {
    'Club': {
      single: 'Club',
      plural: 'Clubs',
      short: 'C',
      icon: '\u2663',
    },
    'Diamond': {
      single: 'Diamond',
      plural: 'Diamonds',
      short: 'D',
      icon: '\u2666',
    },
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
  }

  /**
   * 
   * @param key unique string made up of the suit name, card description, and card sort value joined with '_', e.g. Heart_Five_5 = 5 of Hearts
   */
  constructor(key: PlayingCardKey) {
    this.key = key;
    const [suit, sortValue] = key.split('_');
    this.suit = PlayingCard.cardSuits[suit];
    this.description = CardTuple[Number(sortValue)];
    this.sort = {
      name: Number(sortValue) > 10 ? this.description.substring(0, 1) : sortValue,
      value: Number(sortValue),
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

  static pointValue(key: PlayingCardKey): number[] {
    const sortValue = Number(key.split('_')[1]);
    return (sortValue === 14) ? [1, 11] : (sortValue > 9) ? [10, 10] : [sortValue, sortValue];
  }

}
