import { GameStatus } from "../enums";
import { PlayerKey } from "./BasePlayer";
import { MessageBarDefinition } from "./MessageBarDefinition";

export type GameState = {
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  loser?: PlayerKey;
  winner?: PlayerKey;
  dealerHasControl: boolean;
  minimumBet: number;
  pot: number;
  round: number;
  turnCount: number;
  lastWriteTime: string;
  messageBarDefinition: MessageBarDefinition;
  controllingPlayer?: PlayerKey;
}
