import { createContext } from 'react';
import { SettingsState } from '../types';
import { ISettingReducerAction } from '../interfaces';
import { settingDefaults } from './settingDefaults';

export const SettingContext = createContext<SettingsState>(settingDefaults);
export const SettingDispatchContext = createContext<React.Dispatch<ISettingReducerAction>>(() => { });
