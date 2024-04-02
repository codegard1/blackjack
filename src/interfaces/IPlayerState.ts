import { PlayerStats } from "../types";
import { IPlayer } from ".";


/**
 * Additional Player properties that are set during gameplay
 */
export interface IPlayerState extends IPlayer {
  totalBet: number;
  stats: PlayerStats;
  isFinished: boolean;
  isSelected: boolean;
  isStaying: boolean;
}
