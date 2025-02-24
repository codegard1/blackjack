import { IPlayerStoreState } from ".";
import { GameAction, GameStatus } from "../enums";
import { DeckState, MessageBarDefinition, PlayerKey, PlayingCardKey } from "../types";

export interface IGameReducerAction {
  cardKey?: PlayingCardKey;
  controllingPlayerKey?: PlayerKey;
  deckSide?: 'top' | 'bottom' | 'random';
  deckState?: DeckState;
  gameStatus?: GameStatus;
  messageBarDefinition?: MessageBarDefinition;
  minimumBet?: number;
  numberOfCards?: number;
  playerKey?: PlayerKey | PlayerKey[];
  playerState?: IPlayerStoreState;
  potIncrement?: number;
  type: GameAction;
}
