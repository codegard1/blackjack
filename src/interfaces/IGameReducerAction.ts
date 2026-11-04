import { IPlayerStoreState } from ".";
import { IPlayerOptions } from "./IPlayerOpts";
import { GameAction, GameStatus } from "../enums";
import { DeckState, MessageBarDefinition, PlayerKey, PlayingCardKey } from "../types";

export interface IGameReducerAction {
  cardKey?: PlayingCardKey;
  betAmount?: number;
  clearActivityLog?: boolean;
  controllingPlayerKey?: PlayerKey;
  deckSide?: 'top' | 'bottom' | 'random';
  deckState?: DeckState;
  gameStatus?: GameStatus;
  messageBarDefinition?: MessageBarDefinition;
  minimumBet?: number;
  numberOfCards?: number;
  playerKey?: PlayerKey | PlayerKey[];
  playerState?: IPlayerStoreState;
  /** the seats for a new game, in seating order; takes precedence over playerKey */
  players?: IPlayerOptions[];
  potIncrement?: number;
  type: GameAction;
}
