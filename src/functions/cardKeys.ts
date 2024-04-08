import { PlayingCard } from "../classes";
import { CardTuple } from "../enums";
import { PlayingCardKey } from "../types";

/** Create unique identifiers representing each card in the deck */
export function _cardKeys(): PlayingCardKey[] {
  // Initialize a timer
  const timerName = '_cardKeys';
  console.time(timerName);

  // Initialize an array to hold our output value
  let _: PlayingCardKey[] = [];

  // For each suit defined in the PlayingCard class
  for (let key in PlayingCard.cardSuits) {

    // Get the suit name
    const suitName = PlayingCard.cardSuits[key];

    // Generate 13 cards starting at 2
    for (let index = 2; index < 14; index++) {

      // Compose the Card key from the Suit name, the Card name, and the Card sort 
      // Add the card key to our output array
      _.push([suitName.single, CardTuple[index], index].join('_'));

    }
  }

  // Stop timer
  console.timeEnd(timerName);

  // Return a copy of the array
  return _.slice();
}
