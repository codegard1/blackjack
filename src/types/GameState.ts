import { PlayerStore, PlayingCardDeck } from "../classes";
import { GameStatus } from "../enums";
import { BotAccountState, PlayerKey, TableRules } from "./";

export type GameState = {
  activityLog: ActivityLogEntry[];
  activeHandIndex: number;
  /** persistent bank, balance history and away-working state for every computer character */
  botAccounts: Record<string, BotAccountState>;
  controllingPlayer?: PlayerKey;
  dealerHasControl: boolean;
  deck: PlayingCardDeck;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  minimumBet: number;
  playerStore: PlayerStore;
  pot: number;
  round: number;
  tableRules: TableRules;
  turnCount: number;
  winner?: PlayerKey;
}

export type ActivityLogEntry = {
  id: number;
  sessionId?: number;
  /** the hand this entry belongs to; absent in logs saved before hands were tracked */
  round?: number;
  event?: 'game' | 'round' | 'deal' | 'draw' | 'ante' | 'bet' | 'double' | 'split' | 'stay' | 'win' | 'loss' | 'push' | 'shuffle' | 'work';
  timestamp: number;
  name: string;
  description: string;
  /** change to the player's bank from this entry; negative when money is put in */
  amount?: number;
}
