import { CardTuple } from "../enums";
import { IPlayingCardSort, IPlayingCardSuit } from "../interfaces";
import { PlayingCardKey, SuitName } from "../types";

export type PlayingCardData = {
  key: PlayingCardKey;
  suit: IPlayingCardSuit;
  description: string;
  sort: IPlayingCardSort;
};

/** Predefined suit metadata in canonical deck-generation order */
export const CARD_SUITS: Record<SuitName, IPlayingCardSuit> = {
  Club: {
    single: 'Club',
    plural: 'Clubs',
    short: 'C',
    icon: '\u2663',
  },
  Diamond: {
    single: 'Diamond',
    plural: 'Diamonds',
    short: 'D',
    icon: '\u2666',
  },
  Heart: {
    single: 'Heart',
    plural: 'Hearts',
    short: 'H',
    icon: '\u2665',
  },
  Spade: {
    single: 'Spade',
    plural: 'Spades',
    short: 'S',
    icon: '\u2660',
  },
};

/** Parse a card key such as `Heart_12` or `Spade_14_2` into display metadata */
export function parseCard(key: PlayingCardKey): PlayingCardData {
  const [suit, sortValue] = key.split('_');
  const rank = Number(sortValue);
  const description = CardTuple[rank];
  return {
    key,
    suit: CARD_SUITS[suit as SuitName],
    description,
    sort: {
      name: rank > 10 ? description.substring(0, 1) : sortValue,
      value: rank,
    },
  };
}

/** Human-readable card name, e.g. `Queen of Hearts` */
export function formatCardName(key: PlayingCardKey): string {
  const card = parseCard(key);
  return `${card.description} of ${card.suit.plural}`;
}

/** Blackjack point values `[low, high]` for a card key */
export function cardPointValue(key: PlayingCardKey): [number, number] {
  const sortValue = Number(key.split('_')[1]);
  return sortValue === 14 ? [1, 11] : sortValue > 9 ? [10, 10] : [sortValue, sortValue];
}

/** Generate unique card keys for each deck in a shoe */
export function buildCardKeys(numberOfDecks = 1): PlayingCardKey[] {
  const keys: PlayingCardKey[] = [];
  for (const suit of Object.values(CARD_SUITS)) {
    for (let index = 2; index < 15; index++) {
      keys.push(`${suit.single}_${index}`);
    }
  }
  return Array.from({ length: numberOfDecks }, (_, index) =>
    index === 0 ? keys.slice() : keys.map((key) => `${key}_${index + 1}`)).flat();
}
