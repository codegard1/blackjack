import { settingDefaults } from "../context/SettingContext";
import { ISettingReducerAction } from "../interfaces";
import { SettingKey, SettingsState } from "../types";

/** Copy the named settings from `source` onto a new settings object */
export function assignSettings(settings: SettingsState, source: SettingsState, keys: readonly SettingKey[]): SettingsState {
  const next: Record<string, unknown> = { ...settings };
  keys.forEach((key) => { next[key] = source[key]; });
  return next as SettingsState;
}

/**
 * Reducer function for app settings
 * @param settings settings state object
 * @param action a setting key with its new value, or a reset of some or all settings
 * @returns the next settings state
 */
export function settingReducer(settings: SettingsState, action: ISettingReducerAction): SettingsState {
  if (action.key === 'reset') {
    return assignSettings(settings, settingDefaults, action.keys ?? Object.keys(settingDefaults) as SettingKey[]);
  }
  if (!(action.key in settingDefaults)) return settings;
  return { ...settings, [action.key]: action.value };
}
