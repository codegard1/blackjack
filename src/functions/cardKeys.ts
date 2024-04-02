import { PlayingCardKey, PlayingCardSuit } from "../types";
import { cardSuits } from "./cardSuits";
import { cardTuples } from "./cardTuples";

/** Create nique identifiers representing each card in the deck */
export function _cardKeys(): PlayingCardKey[] {
  let _: PlayingCardKey[] = [];
  cardSuits.forEach((suit: PlayingCardSuit) =>
    cardTuples().forEach((t) =>
      _.push(
        [suit.single, t.name, t.value].join('_')
      )
    )
  );
  return _.slice();
}
