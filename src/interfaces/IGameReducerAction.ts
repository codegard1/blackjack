import { GameAction, GameStatus } from "../enums";
import { DeckState, MessageBarDefinition, PlayerKey, PlayingCardKey } from "../types";

export interface IGameReducerAction {
  type: GameAction;
  cardKey?: PlayingCardKey;
  controllingPlayerKey?: PlayerKey;
  deckSide?: 'top' | 'bottom' | 'random';
  gameStatus?: GameStatus;
  messageBarDefinition?: MessageBarDefinition;
  minimumBet?: number;
  numberOfCards?: number;
  playerKey?: PlayerKey | PlayerKey[];
  potIncrement?: number;
  deckState?: DeckState;
}
