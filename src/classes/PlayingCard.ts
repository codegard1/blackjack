import { IPlayingCard } from "../interfaces";
import { PlayingCardKey, Suit } from "../types";
import { PlayingCardSort, PlayingCardSuit } from "./";

/**
 * A single playing card
 */
export class PlayingCard implements IPlayingCard {
  public readonly suit: PlayingCardSuit;
  public readonly description: string;
  public readonly sort: PlayingCardSort;
  public readonly key: string;

  /**
   * 
   * @param key unique string made up of the suit name, card description, and card sort value joined with '_', e.g. Spade_Five_5
   */
  constructor(key: PlayingCardKey) {
    const [suit, description, sort] = key.split('_');
    this.suit = new PlayingCardSuit(suit as Suit);
    this.description = description;
    this.sort = new PlayingCardSort(Number(sort));
    this.key = key;
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
