import { PlayerStore, PlayingCardDeck } from "../classes";
import { GameStatus } from "../enums";
import { MessageBarDefinition, PlayerKey } from "./";

export type GameState = {
  controllingPlayer?: PlayerKey;
  dealerHasControl: boolean;
  deck: PlayingCardDeck;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  messageBarDefinition: MessageBarDefinition;
  minimumBet: number;
  playerStore: PlayerStore;
  pot: number;
  round: number;
  turnCount: number;
  winner?: PlayerKey;
}
