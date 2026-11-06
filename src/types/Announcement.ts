import { GameStatus } from "../enums";
import { PlayerKey } from "./PlayerKey";
import { PlayerRole, RoundResult } from "./Seat";

export type AnnouncementTone = 'brand' | 'neutral' | 'danger' | 'success' | 'info';

/**
 * A large, short-lived notice shown over the table (turn changes, hits, busts, results)
 */
export type Announcement = {
  title: string;
  subtitle?: string;
  tone: AnnouncementTone;
  kind?: 'pot-contribution';
  /** the seat the notice is about; its portrait is shown when it has one */
  playerKey?: PlayerKey;
};

/** An announcement that has been queued for display */
export type ToastItem = Announcement & { id: number };

/** The parts of a player that announcements are derived from */
export type PlayerSnapshot = {
  key: PlayerKey;
  title: string;
  isNPC: boolean;
  role: PlayerRole;
  cardCount: number;
  total: number;
  isBusted: boolean;
  isStaying: boolean;
  isBlackjack: boolean;
  result?: RoundResult;
};

/** The parts of the game that announcements are derived from */
export type GameSnapshot = {
  gameStatus: GameStatus;
  round: number;
  pot: number;
  totalPotContributions: number;
  controllingPlayer?: PlayerKey;
  players: PlayerSnapshot[];
};
