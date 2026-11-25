import React from 'react';
import { ISettingReducerAction } from '../../shared/ISettingReducerAction';
import { SettingsState } from '../../shared';
import { normalizeSettings, toRemoteSettings } from './persistence';
import { useRemoteSync } from './useRemoteSync';

/**
 * Keep the app settings in step with the server so preferences such as theme,
 * appearance, and table options are retained across sessions and browsers; see useRemoteSync.
 */
export function useSettingSync(
  settings: SettingsState,
  dispatch: React.Dispatch<ISettingReducerAction>,
  options: { enabled?: boolean } = {},
): void {
  useRemoteSync<SettingsState>({
    kind: 'settings',
    value: settings,
    toRemote: toRemoteSettings,
    preview: (remote) => normalizeSettings(remote),
    replace: (remote) => dispatch({ key: 'replace', settings: remote }),
    ...options,
  });
}
