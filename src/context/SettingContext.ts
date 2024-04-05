import { Dispatch, createContext, useContext } from 'react';
import { ISettingReducerAction } from '../interfaces';
import { SettingsState } from '../types';
import { settingDefaults } from './settingDefaults';

// Create context with default values
export const SettingContext = createContext<SettingsState>(settingDefaults);
export const SettingDispatchContext = createContext<Dispatch<ISettingReducerAction>>(() => { });

// Custom hook to consume context
export const useSettingContext = () => {
  const settings = useContext(SettingContext);
  const toggleSetting = useContext(SettingDispatchContext);

  if (!settings || !toggleSetting) {
    throw new Error('useSettingContext must be used within a SettingProvider');
  }

  return {settings, toggleSetting};
}
