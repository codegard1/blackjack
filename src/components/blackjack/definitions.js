/**
 * Definitions
 */

export const defaultPlayers = [
  { id: 1, title: "Chris", isNPC: false },
  { id: 2, title: "Dealer", isNPC: true },
  { id: 3, title: "John", isNPC: true },
];

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
