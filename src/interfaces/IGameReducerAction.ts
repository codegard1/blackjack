import { IPlayerOptions } from "./IPlayerOpts";
import { GameAction, GameStatus } from "../enums";
import { PlayerKey, PlayingCardKey, TableRules } from "../types";

export interface IGameReducerAction {
  cardKey?: PlayingCardKey;
  betAmount?: number;
  clearActivityLog?: boolean;
  deckSide?: 'top' | 'bottom' | 'random';
  gameStatus?: GameStatus;
  handIndex?: number;
  numberOfCards?: number;
  playerKey?: PlayerKey | PlayerKey[];
  /** the seats for a new game, in seating order; takes precedence over playerKey */
  players?: IPlayerOptions[];
  /** a saved game to resume, for RestoreGame; ignored when it is not a valid snapshot */
  snapshot?: unknown;
  tableRules?: TableRules;
  type: GameAction;
}
