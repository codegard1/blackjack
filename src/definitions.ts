/**
 * Definitions
 */

import { IDropdownOption } from "@fluentui/react";
import { Player, PlayerKey } from "./types";



//  Default players as array
export const defaultPlayers: Player[] = [
  { id: 1, key: "chris", title: "Chris", isNPC: false, disabled: false, selected: true, bank: 1000 },
  { id: 2, key: "dealer", title: "Dealer", isNPC: true, disabled: false, selected: true, bank: 1000 },
  { id: 3, key: "john", title: "John", isNPC: false, disabled: true, selected: false, bank: 1000 },
  { id: 4, key: "ralph", title: "Ralph", isNPC: false, disabled: true, selected: false, bank: 1000 },
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
export const defaultPlayersDropdownOptions: IDropdownOption[] = defaultPlayers.map(v => { return { text: v.title, ...v } })
// [
//   { key: 'chris', text: 'Chris', isNPC: false, isSelected: true },
//   { key: 'dealer', text: 'Dealer', isNPC: true, isSelected: true },
//   { key: 'john', text: 'John', isNPC: false, disabled: true, isSelected: false },
//   { key: 'ralph', text: 'Ralph', isNPC: false, disabled: true, isSelected: false, },
// ];

export const defaultSelectedPlayerKey: PlayerKey = "chris";
