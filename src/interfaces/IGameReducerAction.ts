import { GameStatus } from "../enums";
import { MessageBarDefinition, PlayerKey } from "../types";

export interface IGameReducerAction {
  type: string;
  messageBarDefinition?: MessageBarDefinition;
  minimumBet?: number;
  potIncrement?: number;
  controllingPlayerKey?: PlayerKey;
  gameStatus?: GameStatus;
}
