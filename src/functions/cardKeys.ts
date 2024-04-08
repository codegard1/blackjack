import { PlayingCard } from "../classes";
import { CardTuple, PlayingCardKey } from "../types";

const cardTuples: CardTuple[] = [
  { name: "Two", value: 2 },
  { name: "Three", value: 3 },
  { name: "Four", value: 4 },
  { name: "Five", value: 5 },
  { name: "Six", value: 6 },
  { name: "Seven", value: 7 },
  { name: "Eight", value: 8 },
  { name: "Nine", value: 9 },
  { name: "Ten", value: 10 },
  { name: "Jack", value: 11 },
  { name: "Queen", value: 12 },
  { name: "King", value: 13 },
  { name: "Ace", value: 14 },
];

/** Create unique identifiers representing each card in the deck */
export function _cardKeys(): PlayingCardKey[] {
  let _: PlayingCardKey[] = [];
  for (let key in PlayingCard.cardSuits) {
    const s = PlayingCard.cardSuits[key];
    cardTuples.forEach((t) =>
      _.push(
        [s.single, t.name, t.value].join('_')
      )
    )
  }
  return _.slice();
}
