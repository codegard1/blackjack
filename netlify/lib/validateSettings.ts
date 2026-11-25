import {
  isValidSettingValue,
  settingDefaults,
  type SettingKey,
  type SettingsState,
} from '../../shared/SettingState';
import { isObject, parseJsonBody } from './validate';

/** The largest request body a settings PUT accepts; a full settings object is under 1 KB */
export const SETTINGS_MAX_BODY_BYTES = 4 * 1024;

/** The settings stored for an owner: all configurable settings except transient drawer visibility */
export type RemoteSettings = Omit<SettingsState, 'isOptionsPanelVisible'>;

const PERSISTED_KEYS = (Object.keys(settingDefaults) as SettingKey[])
  .filter((key): key is Exclude<SettingKey, 'isOptionsPanelVisible'> => key !== 'isOptionsPanelVisible');

/** Keep only the persisted settings fields, returning undefined if any are missing or invalid */
function pickSettings(value: unknown): RemoteSettings | undefined {
  if (!isObject(value)) return undefined;
  if ('isOptionsPanelVisible' in value && value.isOptionsPanelVisible !== undefined && typeof value.isOptionsPanelVisible !== 'boolean') {
    return undefined;
  }
  const picked: Record<string, unknown> = {};
  for (const key of PERSISTED_KEYS) {
    if (!isValidSettingValue(key, value[key])) return undefined;
    picked[key] = value[key];
  }
  return picked as RemoteSettings;
}

/**
 * Parse the body of a settings PUT: JSON of the form `{ settings: SettingsState }`.
 * Returns the cleaned settings, or the reason the body was rejected.
 */
export function parseSettingsBody(text: string): { data: RemoteSettings } | { error: string } {
  if (Buffer.byteLength(text) > SETTINGS_MAX_BODY_BYTES) return { error: 'Body too large.' };
  const parsed = parseJsonBody(text);
  if ('error' in parsed) return parsed;
  const data = pickSettings(parsed.body.settings);
  if (!data) return { error: 'Body must be { settings: SettingsState }.' };
  return { data };
}
