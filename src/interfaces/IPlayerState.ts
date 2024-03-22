import { PlayerStats } from "../types";
import { IPlayer } from "./IPlayer";


/**
 * additional properties that are set by gameplay
 */
export interface IPlayerState extends IPlayer {
  totalBet: number;
  stats: PlayerStats;
  isFinished?: boolean;
  isSelected?: boolean;
  isStaying?: boolean;
}
