import { PlayingCardSuit, cardTuples } from "../classes";
import { PlayingCardKey, Suit } from "../types";

/** Create nique identifiers representing each card in the deck */
export function _cardKeys(): string[] {
  let _: PlayingCardKey[] = [];
  PlayingCardSuit.suits().forEach((suit: Suit) =>
    cardTuples().forEach((t) =>
      _.push(
        [suit, t.name, t.value].join('_')
      )
    )
  );
  return _.slice();
}
