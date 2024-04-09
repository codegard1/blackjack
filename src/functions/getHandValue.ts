import { PlayingCard } from "../classes";
import { PlayerHandValue, PlayingCardKey } from "../types";

/**
 * Calculate and return the possible point values of a given set of cardKeys
 * @param hand array of Card Keys
 * @returns 
 */
export function handValue(hand: PlayingCardKey[]): PlayerHandValue {
  const aceAsOne: number = hand.reduce((prev: number, curr: string) => prev + PlayingCard.pointValue(curr)[1], 0),
    aceAsEleven: number = hand.reduce((prev: number, curr: string) => prev + PlayingCard.pointValue(curr)[2], 0);
  return {
    aceAsEleven,
    aceAsOne,
    highest: Math.max(aceAsEleven, aceAsOne),
  }
}
