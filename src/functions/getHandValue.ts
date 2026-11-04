import { PlayingCard } from "../classes/PlayingCard";
import { PlayerHandValue, PlayingCardKey } from "../types";

/**
 * Calculate and return the possible point values of a given set of cardKeys
 * @param hand array of Card Keys
 * @returns 
 */
export function handValue(hand: PlayingCardKey[]): PlayerHandValue {
  const aceAsOne = hand.reduce((total, key) => total + PlayingCard.pointValue(key)[0], 0);
  const hasAce = hand.some((key) => Number(key.split('_')[1]) === 14);
  const aceAsEleven = aceAsOne + (hasAce ? 10 : 0);
  return {
    aceAsEleven,
    aceAsOne,
    highest: aceAsEleven <= 21 ? aceAsEleven : aceAsOne,
  }
}
