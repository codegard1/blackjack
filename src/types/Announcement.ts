import { GameStatus } from "../enums";
import { PlayerKey } from "./PlayerKey";

export type AnnouncementTone = 'brand' | 'neutral' | 'danger' | 'success' | 'info';

/**
 * A large, short-lived notice shown over the table (turn changes, hits, busts, results)
 */
export type Announcement = {
  title: string;
  subtitle?: string;
  tone: AnnouncementTone;
  kind?: 'pot-contribution';
};

/** An announcement that has been queued for display */
export type ToastItem = Announcement & { id: number };

/** The parts of a player that announcements are derived from */
export type PlayerSnapshot = {
  key: PlayerKey;
  title: string;
  isNPC: boolean;
  cardCount: number;
  total: number;
  isBusted: boolean;
  isStaying: boolean;
  isBlackjack: boolean;
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
