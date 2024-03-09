/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { IPlayingCard } from "../types/IPlayingCard";
import { PlayingCardSort } from "./PlayingCardSort";
import { Suit } from "./Suit";


class PlayingCard implements IPlayingCard {
  public suit: Suit;
  public description: string;
  public sort: PlayingCardSort;

  constructor(suit: Suit, description: string, sort: number) {
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

export default PlayingCard;
