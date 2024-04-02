import { ISettingReducerAction } from "../interfaces";
import { SettingsState } from "../types";

/**
 * Reducer function for app settings
 * @param settings settings state object
 * @param action action containing the setting name and new value (optional)
 * @returns 
 */
export function settingReducer(settings: SettingsState, action: ISettingReducerAction) {

  const { key, value } = action;

  switch (key) {
    case 'isOptionsPanelVisible':
      return { ...settings, isOptionsPanelVisible: value }
    case 'isSplashScreenVisible':
      return { ...settings, isSplashScreenVisible: value }
    case 'isActivityLogVisible':
      return { ...settings, isActivityLogVisible: value }
    case 'isCardDescVisible':
      return { ...settings, isCardDescVisible: value }
    case 'isCardTitleVisible':
      return { ...settings, isCardTitleVisible: value }
    case 'isDealerHandVisible':
      return { ...settings, isDealerHandVisible: value }
    case 'isDeckVisible':
      return { ...settings, isDeckVisible: value }
    case 'isDrawnVisible':
      return { ...settings, isDrawnVisible: value }
    case 'isHandValueVisible':
      return { ...settings, isHandValueVisible: value }
    case 'isSelectedVisible':
      return { ...settings, isSelectedVisible: value }
    case 'isMessageBarVisible':
      return { ...settings, isMessageBarVisible: value }
    default: {
      return settings;
    }
  }
}
