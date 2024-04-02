import { createContext } from 'react';
import { SettingsState } from '../types';
import { ISettingReducerAction } from '../interfaces';

export const SettingContext = createContext<SettingsState>({});
export const SettingDispatchContext = createContext<React.Dispatch<ISettingReducerAction>>(() => { });
