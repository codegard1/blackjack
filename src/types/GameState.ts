import { PlayerStore, PlayingCardDeck } from "../classes";
import { GameStatus } from "../enums";
import { MessageBarDefinition, PlayerKey } from "./";

export type GameState = {
  activePlayerKeys?: PlayerKey[];
  controllingPlayer?: PlayerKey;
  currentPlayerKey?: PlayerKey;
  dealerHasControl: boolean;
  deck: PlayingCardDeck;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  messageBarDefinition: MessageBarDefinition;
  minimumBet: number;
  players: any[];
  playerStore: PlayerStore;
  pot: number;
  round: number;
  turnCount: number;
  winner?: PlayerKey;
}
