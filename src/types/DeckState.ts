import { PlayerKey, PlayingCardKey } from "../types";

export interface DeckState {
  selectedKeys: PlayingCardKey[];
  drawnKeys: PlayingCardKey[];
  cardKeys: PlayingCardKey[];
  playerHands: {
    [index: PlayerKey]: PlayingCardKey[];
  }
}
