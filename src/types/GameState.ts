import { PlayerStore, PlayingCardDeck } from "../classes";
import { GameStatus } from "../enums";
import { MessageBarDefinition, PlayerKey } from "./";

export type GameState = {
  activityLog: ActivityLogEntry[];
  controllingPlayer?: PlayerKey;
  dealerHasControl: boolean;
  deck: PlayingCardDeck;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  messageBarDefinition: MessageBarDefinition;
  minimumBet: number;
  playerStore: PlayerStore;
  pot: number;
  round: number;
  turnCount: number;
  winner?: PlayerKey;
}

export type ActivityLogEntry = {
  id: number;
  sessionId?: number;
  event?: 'game' | 'round' | 'deal' | 'draw' | 'bet' | 'stay' | 'win' | 'shuffle';
  timestamp: number;
  name: string;
  description: string;
}
