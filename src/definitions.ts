import { IDropdownOption } from "@fluentui/react";
import { Player } from "./classes";
import { PlayerKey } from "./types";

//  Default players as array
export const defaultPlayers: Player[] = [
  { key: 'chris', title: 'Chris', disabled: false, bank: 1000, isNPC: true },
  { key: 'dealer', title: 'Delaer', disabled: false, bank: 1000, isNPC: true },
  { key: 'john', title: 'John', disabled: false, bank: 1000, isNPC: true },
  { key: 'ralph', title: 'Ralph', disabled: false, bank: 1000, isNPC: true }
].map((p, i) => new Player({ id: i, ...p }));


/**
 * default keys for the Dropdown on  the splash dialog
 */
export const defaultSelectedPlayerKeys: PlayerKey[] = defaultPlayers.slice(0, 2).map((p) => p.key);

/**
 * default options for the splash dialog dropdown
 */
export const defaultPlayersDropdownOptions: IDropdownOption[] = defaultPlayers.map(v => {
  return {
    ...v,
    text: v.title,
    id: v.id.toString(),
    index: v.id,
    selected: v.key in defaultSelectedPlayerKeys,
  }
})

export const defaultSelectedPlayerKey: PlayerKey = "chris";
