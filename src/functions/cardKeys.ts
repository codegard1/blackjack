import { PlayingCard } from "../classes";
import { PlayingCardKey } from "../types";
import { cardTuples } from "./cardTuples";

/** Create nique identifiers representing each card in the deck */
export function _cardKeys(): PlayingCardKey[] {
  let _: PlayingCardKey[] = [];
  for (let key in PlayingCard.cardSuits) {
    const s = PlayingCard.cardSuits[key];
    cardTuples().forEach((t) =>
      _.push(
        [s.single, t.name, t.value].join('_')
      )
    )
  }
  return _.slice();
}
