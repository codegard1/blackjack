import { GameStatus } from '../enums';
import { BotMove } from '../functions/botStrategy';
import { PlayerHandValue, PlayerKey } from '../types';

export interface IAgentProps {
  /** true while this computer seat has control */
  hasControl: boolean;
  gameStatus: GameStatus;
  handValue: PlayerHandValue;
  /** cards in the hand; a new card can leave the highest total unchanged */
  cardCount?: number;
  playerKey: PlayerKey;
  handIndex?: number;
  /** chooses the move when the delay is up; defaults to the dealer's rule (hit below 17) */
  decide?: () => BotMove;
  /** pause before acting; defaults to DEALER_ACTION_DELAY_MS */
  delayMs?: number;
  /** hold the next computer action, e.g. while the pot bounces */
  isPaused?: boolean;
}
