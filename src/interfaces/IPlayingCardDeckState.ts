import { PlayerHandList } from "../classes";
import { PlayingCardKey } from "../types";

export interface IPlayingCardDeckState {
  selectedKeys: PlayingCardKey[];
  drawnKeys: PlayingCardKey[];
  cardKeys: PlayingCardKey[];
  playerHands: PlayerHandList;
}
