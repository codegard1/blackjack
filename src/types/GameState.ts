import { PlayerStore } from "../classes";
import { GameStatus } from "../enums";
import { MessageBarDefinition, PlayerCollection, PlayerKey } from "./";

export type GameState = {
  activePlayerKeys?: PlayerKey[];
  controllingPlayer?: PlayerKey;
  currentPlayerKey?: PlayerKey;
  dealerHasControl: boolean;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  messageBarDefinition: MessageBarDefinition;
  minimumBet: number;
  players?: PlayerCollection;
  pot: number;
  round: number;
  turnCount: number;
  winner?: PlayerKey;
  playerStore: PlayerStore;
}
