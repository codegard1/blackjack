import { PlayerHandList, PlayingCardKey } from "./";

export interface DeckState {
  selectedKeys: PlayingCardKey[];
  drawnKeys: PlayingCardKey[];
  cardKeys: PlayingCardKey[];
  playerHands: PlayerHandList;
}
