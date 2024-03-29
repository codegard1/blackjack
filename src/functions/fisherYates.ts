import { PlayingCardKey } from "../types";
/**
 * array shuffling algorithm: http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 * @param cards 
 */
export function fisherYates(cardKeys: PlayingCardKey[]): PlayingCardKey[] {
  let _cards = cardKeys.slice();
  if (_cards.length === 0) return [];
  let i = _cards.length;
  while (--i) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempi = _cards[i];
    const tempj = _cards[j];
    _cards[i] = tempj;
    _cards[j] = tempi;
  }
  return _cards;
}
