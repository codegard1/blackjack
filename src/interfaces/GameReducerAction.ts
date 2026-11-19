import { IPlayerOptions } from "./IPlayerOpts";
import { GameAction } from "../enums";
import { PlayerKey, PlayingCardKey, TableRules } from "../types";

/** What every action may carry; `stampAction` adds both where actions are dispatched */
type ActionStamp = {
  /** when the action happened, in milliseconds since the epoch; the clock is read when it is absent */
  now?: number;
  /** seeds whatever the action does at random (a shuffle, a computer player's wager); Math.random is used when it is absent */
  seed?: number;
};

/** Names the seat and hand a move is for; the seat and hand in control when absent */
type SeatMove = {
  playerKey?: PlayerKey;
  handIndex?: number;
};

/** What each action carries, by its type */
type ActionPayloads = {
  /** Add a wager to the pot from a player's bank */
  [GameAction.Bet]: { playerKey: PlayerKey; betAmount: number };
  /** Deal two cards to every seat, starting the next round first if the last one is over */
  [GameAction.Deal]: { tableRules?: TableRules };
  [GameAction.DoubleDown]: SeatMove;
  /** Draw cards, into a seat's hand when one is named */
  [GameAction.Draw]: SeatMove & { deckSide?: 'top' | 'bottom' | 'random'; numberOfCards?: number };
  /** Run the bookkeeping the current status calls for: the opening antes, or a finished round's payouts */
  [GameAction.EvaluateGame]: object;
  /** Seat a new game: the seats in `players`, or else the default players named in `playerKeys` */
  [GameAction.NewGame]: { players?: IPlayerOptions[]; playerKeys?: PlayerKey[]; tableRules?: TableRules };
  [GameAction.NewRound]: { tableRules?: TableRules };
  [GameAction.ResetGame]: { clearActivityLog?: boolean };
  /** Resume a saved game; a snapshot that is not valid leaves the game as it is */
  [GameAction.RestoreGame]: { snapshot: unknown };
  [GameAction.Select]: { cardKey: PlayingCardKey };
  /** Toggle or set sitting out status for a player (defaults to the human player) */
  [GameAction.SitOut]: { playerKey?: PlayerKey; isSittingOut?: boolean };
  /** Change who sits at the table, in seating order; ignored while a hand is in play */
  [GameAction.SetRoster]: { players: IPlayerOptions[] };
  [GameAction.SetSpinnerVisible]: object;
  [GameAction.Shuffle]: object;
  [GameAction.Split]: SeatMove;
  [GameAction.Stay]: SeatMove;
  [GameAction.Unselect]: { cardKey: PlayingCardKey };
};

/**
 * An action for `gameReducer`: its type, and exactly what that type carries. Every
 * GameAction has an entry above, so a new one cannot be dispatched until it is described.
 */
export type GameReducerAction = {
  [Type in GameAction]: { type: Type } & ActionPayloads[Type] & ActionStamp;
}[GameAction];
