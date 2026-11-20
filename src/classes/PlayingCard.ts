import { CARD_SUITS, cardPointValue, formatCardName, parseCard } from "../functions/cards";
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
  static cardSuits: { [index: string]: IPlayingCardSuit } = CARD_SUITS;

  /**
   * 
   * @param key unique string made up of the suit name, card description, and card sort value joined with '_', e.g. Heart_Five_5 = 5 of Hearts
   */
  constructor(key: PlayingCardKey) {
    const parsed = parseCard(key);
    this.key = parsed.key;
    this.suit = parsed.suit;
    this.description = parsed.description;
    this.sort = parsed.sort;
  }

  public toString() {
    return formatCardName(this.key);
  }

  public toShortDisplayString() {
    const suit = this.suit.short;
    let value;

    return value + suit;
  }

  static pointValue(key: PlayingCardKey): number[] {
    return cardPointValue(key);
  }

}
