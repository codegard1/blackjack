import { PlayingCardSuit } from ".";
import { CardTuple, PlayingCardKey, Suit } from "../types";

const _cardTuples: CardTuple[] = [
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

export const cardTuples = (): CardTuple[] => _cardTuples.slice();

/** Unique identifiers for each card in the deck */
export const _cardKeys = (): string[] => {
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
