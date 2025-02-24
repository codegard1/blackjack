import { IDropdownOption } from "@fluentui/react";
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

//  Default players as array
export const defaultplayersArr: IPlayer[] = [
  { ...playerDefaults, key: 'chris', title: 'Chris', disabled: false, bank: 1000, isNPC: false, },
  { ...playerDefaults, key: 'dealer', title: 'Dealer', disabled: false, bank: 1000, isNPC: true },
  { ...playerDefaults, key: 'john', title: 'John', disabled: false, bank: 1000, isNPC: true },
  { ...playerDefaults, key: 'ralph', title: 'Ralph', disabled: false, bank: 1000, isNPC: true }
];

/**
 * default keys for the Dropdown on  the splash dialog
 */
export const defaultSelectedPlayerKeys: PlayerKey[] = defaultplayersArr.slice(0, 2).map((p) => p.key);

/**
 * default options for the splash dialog dropdown
 */
export const defaultPlayersDropdownOptions: IDropdownOption[] = defaultplayersArr.map(v => {
  return {
    ...v,
    text: v.title,
    id: v.id.toString(),
    index: v.id,
    selected: v.key in defaultSelectedPlayerKeys,
  }
})

export const defaultSelectedPlayerKey: PlayerKey = "chris";
