import { GameStatus } from "./";
import { PlayerKey } from "./PlayerKey";
import { PlayerRole, RoundResult } from "./Seat";
import { WorkTaskId } from "./Work";

export type AnnouncementTone = 'brand' | 'neutral' | 'danger' | 'success' | 'info';

/** Controls which notification setting gates the announcement, separately from where it is displayed */
export type AnnouncementCategory = 'gameplay' | 'pot';

/**
 * A short-lived notice shown over the table (blackjacks, busts, results, pot contributions, sit-outs, work updates)
 */
export type Announcement = {
  title: string;
  subtitle?: string;
  tone: AnnouncementTone;
  category: AnnouncementCategory;
  /**
   * pot-contribution: money added to the pot.
   * result: how a seat's hand ended; its chip pulses while the toast is announced.
   */
  kind?: 'pot-contribution' | 'result';
  /** the seat the notice is about; its portrait is shown when it has one */
  playerKey?: PlayerKey;
  /** that seat's name, for the initials a player without a portrait shows */
  playerName?: string;
};

/** An announcement that has been queued for display */
export type ToastItem = Announcement & { id: number };

/** The seat a result is being announced for, and how it went for that seat; its chip pulses meanwhile */
export type ToastFocus = { id: number; key: PlayerKey; tone: AnnouncementTone };

/** A toast on the stack; a leaving one is fading out beneath the card that replaced it */
export type VisibleToast = ToastItem & { isLeaving: boolean };

/** The parts of a player that announcements are derived from */
export type PlayerSnapshot = {
  key: PlayerKey;
  title: string;
  isNPC: boolean;
  role: PlayerRole;
  cardCount: number;
  cards?: string[];
  total: number;
  isBusted: boolean;
  isStaying: boolean;
  isBlackjack: boolean;
  isSittingOut?: boolean;
  awayTask?: WorkTaskId;
  result?: RoundResult;
};

/**
 * Money a player added to the pot after the antes: a wager, a double down or a split.
 * Taken from the activity log, so it carries the log's own wording.
 */
export type WagerSnapshot = {
  /** the log entry's id; ids only grow within a game */
  id: number;
  /** the player's name, as the log has it */
  name: string;
  /** what the player did, e.g. "wagered $25" */
  description: string;
  /** dollars added to the pot */
  amount: number;
};

/**
 * A work notice from the activity log (leaving to work, ready to return, or returning).
 */
export type WorkNoticeSnapshot = {
  id: number;
  name: string;
  description: string;
};

/** The parts of the game that announcements are derived from */
export type GameSnapshot = {
  gameStatus: GameStatus;
  round: number;
  pot: number;
  totalPotContributions: number;
  /** the wagers in the log, oldest first */
  wagers: WagerSnapshot[];
  /** work notices in the log, oldest first */
  workNotices?: WorkNoticeSnapshot[];
  controllingPlayer?: PlayerKey;
  players: PlayerSnapshot[];
};

/** What one player has put into the pot in the current hand */
export type PotShare = {
  /** the player's name, as the activity log has it */
  name: string;
  /** dollars put in so far: the ante and every wager, double down and split */
  amount: number;
  /** the player's seat, when the name is still at the table */
  playerKey?: PlayerKey;
};
