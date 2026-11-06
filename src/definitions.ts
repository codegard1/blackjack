import { PlayerStatus } from "./enums";
import { IPlayer } from "./interfaces";
import { PlayerKey } from "./types";

/**
 * Default player object. The key for each player must be unique
 */
export const playerDefaults: IPlayer = {
  bank: 0,
  disabled: false,
  id: 0,
  isFinished: false,
  isNPC: false,
  isSelected: false,
  isBlackjack: false,
  isBusted: false,
  isStaying: false,
  key: 'default',
  lastAction: undefined,
  lastAnte: undefined,
  lastBet: undefined,
  stats: {
    numberOfGamesLost: 0,
    numberOfGamesPlayed: 0,
    numberOfGamesWon: 0,
    numberOfTimesBlackjack: 0,
    numberOfTimesBusted: 0,
    totalWinnings: 0,
    winLossRatio: 0,
  },
  status: PlayerStatus.OK,
  title: 'Default',
  totalBet: 0,
  turn: false,
};

/** bank each player brings to a new game */
export const STARTING_BANK = 1000;

/**
 * The two seats in every game: the human and the dealer. Used when a game is started
 * with player keys rather than explicit seats.
 */
export const defaultplayersArr: IPlayer[] = [
  { ...playerDefaults, key: 'chris', title: 'Chris', disabled: false, bank: STARTING_BANK, isNPC: false, role: 'human' },
  { ...playerDefaults, key: 'dealer', title: 'Faxe', disabled: false, bank: STARTING_BANK, isNPC: true, role: 'dealer' },
];
