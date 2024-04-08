import { PlayerHandList, PlayingCardKey } from "../types";

export interface DeckState {
  selectedKeys: PlayingCardKey[];
  drawnKeys: PlayingCardKey[];
  cardKeys: PlayingCardKey[];
  playerHands: PlayerHandList;
}
