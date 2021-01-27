/**
 * Definitions
 */

//  Default players as array
export const defaultPlayers = [
  { id: 1, key: "chris", title: "Chris", isNPC: false, selected: true, },
  { id: 2, key: "dealer", title: "Dealer", isNPC: true, selected: true, },
  { id: 3, key: "john", title: "John", isNPC: false, disabled: true, },
  { id: 4, key: "ralph", title: "Ralph", isNPC: false, disabled: true, },
];


// Default players as object
// default state of PLayerStore
export const defaultPlayersObj = (function() { let o = {}; defaultPlayers.forEach(v => o[v.key] = v); return o; })()
// { '1': { id: 1, key: 'chris', title: 'Chris', isNPC: false },
// '2': { id: 2, key: 'dealer', title: 'Dealer', isNPC: true },
// '3': { id: 3, key: 'ralph', title: 'Ralph', isNPC: false } }

/**
 * default keys for the Dropdown on  the splash dialog
 */
export const defaultSelectedPlayerKeys = ['chris', 'dealer'];

/**
 * default options for the splash dialog dropdown
 */
export const defaultPlayersDropdownOptions = defaultPlayers.map(v => { return { text: v.title, ...v } })
// [
//   { key: 'chris', text: 'Chris', isNPC: false, isSelected: true },
//   { key: 'dealer', text: 'Dealer', isNPC: true, isSelected: true },
//   { key: 'john', text: 'John', isNPC: false, disabled: true, isSelected: false },
//   { key: 'ralph', text: 'Ralph', isNPC: false, disabled: true, isSelected: false, },
// ];



export const defaultSelectedPlayerKey = "chris";

export const defaults = {
  selectedPlayerKey: defaultSelectedPlayerKey,
  players: defaultPlayers,
  // default state of ControlPanelStore
  controlPanelStore: {
    isCardDescVisible: false,
    isDealerHandVisible: false,
    isDeckVisible: false,
    isDrawnVisible: false,
    isHandValueVisible: false,
    isMessageBarVisible: false,
    isOptionsPanelVisible: false,
    isSelectedVisible: false,
    players: defaultPlayers,
    selectedPlayerKey: defaultSelectedPlayerKey,
    newPlayerFieldValue: "",
    isNewPlayerFieldEmpty: true,
    isNewPlayerSaveButtonDisabled: false,
  }
}


