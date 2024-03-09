import { IPlayingCard } from "../interfaces";
import { PlayingCardSort, PlayingCardSuit } from "./";

/**
 * A single playing card
 */
export class PlayingCard implements IPlayingCard {
  public suit: PlayingCardSuit;
  public description: string;
  public sort: PlayingCardSort;

  constructor(suit: PlayingCardSuit, description: string, sort: number) {
    this.suit = suit;
    this.description = description;
    this.sort = new PlayingCardSort(sort);
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
