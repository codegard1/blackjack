
import { GameStatus } from '../enums';
import { PlayerHandValue, PlayerKey } from '../types';

export interface IAgentProps {
  dealerHasControl: boolean;
  gameStatus: GameStatus;
  handValue: PlayerHandValue;
  playerKey: PlayerKey;
}
