
import { GameStatus } from '../enums';
import { PlayerHandValue, PlayerKey } from '../types';

export interface IAgentProps {
  dealerHasControl: boolean;
  gameStatus: GameStatus;
  handValue: PlayerHandValue;
  playerKey: PlayerKey;
  /** hold the next dealer action, e.g. while the pot bounces */
  isPaused?: boolean;
}
