import { SettingKey, SettingsState } from './';

/** Set one setting; the value type follows the key */
export type SettingChangeAction = {
  [K in SettingKey]: { key: K; value: SettingsState[K] };
}[SettingKey];

/** Restore the given settings (or every setting) to their defaults */
export interface SettingResetAction {
  key: 'reset';
  keys?: readonly SettingKey[];
}

/** Replace settings with a validated remote copy */
export interface SettingReplaceAction {
  key: 'replace';
  settings: unknown;
}

/**
 * Dispatcher that changes settings values.
 * Possible keys must correspond to settingDefaults in SettingContext.ts
 */
export type ISettingReducerAction = SettingChangeAction | SettingResetAction | SettingReplaceAction;
