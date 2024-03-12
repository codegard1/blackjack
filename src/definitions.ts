/**
 * Definitions
 */

import { IDropdownOption } from "@fluentui/react";
import { PlayerKey } from "./types";
import { Player } from "./classes";



//  Default players as array
export const defaultPlayers: Player[] = [
  new Player('chris', 'Chris', false, 0),
  new Player('chris', 'Delaer', false, 1),
  new Player('john', 'John', false, 2),
  new Player('ralph', 'Ralph', false, 3),
];


// Default players as object
// default state of PLayerStore
export const defaultPlayersObj = () => defaultPlayers.slice();
// { '1': { id: 1, key: 'chris', title: 'Chris', isNPC: false },
// '2': { id: 2, key: 'dealer', title: 'Dealer', isNPC: true },
// '3': { id: 3, key: 'ralph', title: 'Ralph', isNPC: false } }

/**
 * default keys for the Dropdown on  the splash dialog
 */
export const defaultSelectedPlayerKeys: PlayerKey[] = ['chris', 'dealer'];

/**
 * default options for the splash dialog dropdown
 */
export const defaultPlayersDropdownOptions: IDropdownOption[] = defaultPlayers.map(v => {
  return {
    text: v.title,
    key: v.key,
    id: v.id.toString(),
    index: v.id,
    title: v.title,
    selected: (v.id <= 1),
  }
})


export const defaultSelectedPlayerKey: PlayerKey = "chris";
