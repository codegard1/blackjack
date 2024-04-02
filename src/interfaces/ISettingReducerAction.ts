/**
 * Dispatcher that changes state values
 * Possible keys must correspond to 
 * settingDefaults.ts
 */
export interface ISettingReducerAction {
  key: string;
  value: boolean;
}
