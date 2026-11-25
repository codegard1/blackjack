import { GameStatus } from "./";
import { IPlayerStoreState } from "./IPlayerStore";
import { DeckState } from "./DeckState";
import { PlayerKey } from "./PlayerKey";
import { TableRules } from "./TableRules";
import { BotAccountState } from "./Work";

export type SessionSeatStats = {
  title: string;
  hands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  busts: number;
  net: number;
  balanceHistory: number[];
};

export type SessionSummaryState = {
  seats: Record<PlayerKey, SessionSeatStats>;
};

export type GameState = {
  activityLog: ActivityLogEntry[];
  activeHandIndex: number;
  /** persistent bank, balance history and away-working state for every computer character */
  botAccounts: Record<string, BotAccountState>;
  controllingPlayer?: PlayerKey;
  dealerHasControl: boolean;
  isInsuranceOpen?: boolean;
  deck: DeckState;
  gameStatus: GameStatus;
  gameStatusFlag: boolean;
  isSpinnerVisible: boolean;
  lastWriteTime: string;
  loser?: PlayerKey;
  minimumBet: number;
  playerStore: IPlayerStoreState;
  pot: number;
  round: number;
  session?: SessionSummaryState;
  tableRules: TableRules;
  turnCount: number;
  winner?: PlayerKey;
}

export type ActivityLogEntry = {
  id: number;
  sessionId?: number;
  /** the hand this entry belongs to; absent in logs saved before hands were tracked */
  round?: number;
  event?: 'game' | 'round' | 'deal' | 'draw' | 'ante' | 'bet' | 'double' | 'split' | 'stay' | 'insurance' | 'surrender' | 'win' | 'loss' | 'push' | 'shuffle' | 'work';
  timestamp: number;
  name: string;
  description: string;
  /** change to the player's bank from this entry; negative when money is put in */
  amount?: number;
}
