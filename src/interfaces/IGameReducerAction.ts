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
  /** when the action happened, in milliseconds since the epoch; the clock is read when it is absent */
  now?: number;
  numberOfCards?: number;
  playerKey?: PlayerKey | PlayerKey[];
  /** the seats for a new game, in seating order; takes precedence over playerKey */
  players?: IPlayerOptions[];
  /** seeds whatever the action does at random (a shuffle, a computer player's wager); Math.random is used when it is absent */
  seed?: number;
  /** a saved game to resume, for RestoreGame; ignored when it is not a valid snapshot */
  snapshot?: unknown;
  tableRules?: TableRules;
  type: GameAction;
}
