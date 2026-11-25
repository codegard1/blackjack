// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { settingDefaults } from '../../shared/SettingState';
import { parseSettingsBody, SETTINGS_MAX_BODY_BYTES } from './validateSettings';

const { isOptionsPanelVisible: _, ...remoteDefaults } = settingDefaults;

describe('parseSettingsBody', () => {
  it('returns the settings with unknown keys and isOptionsPanelVisible removed', () => {
    const settings = {
      ...settingDefaults,
      themeMode: 'dark' as const,
      accent: 'teal' as const,
      numberOfDecks: '6' as const,
      isStrategyHintVisible: true,
      isOptionsPanelVisible: true,
      extra: 'drop-me',
    };
    expect(parseSettingsBody(JSON.stringify({ settings }))).toEqual({
      data: {
        ...remoteDefaults,
        themeMode: 'dark',
        accent: 'teal',
        numberOfDecks: '6',
        isStrategyHintVisible: true,
      },
    });
  });

  it('accepts settings without isOptionsPanelVisible', () => {
    expect(parseSettingsBody(JSON.stringify({ settings: remoteDefaults }))).toEqual({
      data: remoteDefaults,
    });
  });

  it('rejects bodies that are too large, not JSON, or the wrong shape', () => {
    expect(parseSettingsBody('x'.repeat(SETTINGS_MAX_BODY_BYTES + 1))).toEqual({ error: 'Body too large.' });
    expect(parseSettingsBody('é'.repeat(SETTINGS_MAX_BODY_BYTES / 2 + 1))).toEqual({ error: 'Body too large.' });
    expect(parseSettingsBody('{not json')).toEqual({ error: 'Body is not valid JSON.' });
    expect(parseSettingsBody('[]')).toEqual({ error: 'Body must be a JSON object.' });
    expect(parseSettingsBody('{}')).toEqual({ error: 'Body must be { settings: SettingsState }.' });
    expect(parseSettingsBody(JSON.stringify({ settings: { themeMode: 'dark' } }))).toEqual({
      error: 'Body must be { settings: SettingsState }.',
    });
  });

  it('rejects invalid enumerated or boolean setting values', () => {
    expect(parseSettingsBody(JSON.stringify({ settings: { ...remoteDefaults, themeMode: 'neon' } }))).toHaveProperty('error');
    expect(parseSettingsBody(JSON.stringify({ settings: { ...remoteDefaults, numberOfDecks: '4' } }))).toHaveProperty('error');
    expect(parseSettingsBody(JSON.stringify({ settings: { ...remoteDefaults, isHandValueVisible: 'yes' } }))).toHaveProperty('error');
    expect(parseSettingsBody(JSON.stringify({ settings: { ...remoteDefaults, isOptionsPanelVisible: 'open' } }))).toHaveProperty('error');
  });
});
