/**
 * Object containing all app settings
 */
export type SettingsState = {
  [index: string]: boolean;
  isActivityLogVisible: boolean;
  isDebugWindowVisible: boolean;
  isCardDescVisible: boolean;
  isDealerHandVisible: boolean;
  isDeckVisible: boolean;
  isDrawnVisible: boolean;
  isHandValueVisible: boolean;
  isOptionsPanelVisible: boolean;
  isSelectedVisible: boolean;
  isMessageBarVisible: boolean;
}

