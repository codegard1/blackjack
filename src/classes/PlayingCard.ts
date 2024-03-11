import { IPlayingCard } from "../interfaces";
import { PlayingCardSort, PlayingCardSuit } from "./";

/**
 * A single playing card
 */
export class PlayingCard implements IPlayingCard {
  public suit: PlayingCardSuit;
  public description: string;
  public sort: PlayingCardSort;
  public key: string;

  constructor(suit: PlayingCardSuit, description: string, sort: number) {
    this.suit = suit;
    this.description = description;
    this.sort = new PlayingCardSort(sort);
    this.key = [suit.single, '_', sort].join();
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
