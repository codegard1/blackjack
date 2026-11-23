import { describe, expect, it } from 'vitest';
import { settingDefaults } from '../context';
import { ISettingReducerAction } from '../interfaces';
import { SettingsState } from '../types';
import { settingReducer } from './settingReducer';

describe('settingReducer', () => {
  it('sets boolean and enumerated settings by key', () => {
    let settings = settingReducer(settingDefaults, { key: 'isDeckVisible', value: true });
    expect(settings.isDeckVisible).toBe(true);

    settings = settingReducer(settings, { key: 'themeMode', value: 'dark' });
    settings = settingReducer(settings, { key: 'accent', value: 'teal' });
    settings = settingReducer(settings, { key: 'cardBackPattern', value: 'lattice' });
    expect(settings).toMatchObject({ isDeckVisible: true, themeMode: 'dark', accent: 'teal', cardBackPattern: 'lattice' });
    expect(settingDefaults.themeMode).toBe('light');
  });

  it('ignores keys that are not settings', () => {
    const action = { key: 'bogus', value: true } as unknown as ISettingReducerAction;
    expect(settingReducer(settingDefaults, action)).toBe(settingDefaults);
  });

  it('resets every setting, or only the named ones, to the defaults', () => {
    const changed: SettingsState = { ...settingDefaults, isDeckVisible: true, themeMode: 'dark', cardStyle: 'bold' };

    const appearanceOnly = settingReducer(changed, { key: 'reset', keys: ['themeMode', 'cardStyle'] });
    expect(appearanceOnly).toMatchObject({ isDeckVisible: true, themeMode: 'light', cardStyle: 'classic' });

    expect(settingReducer(changed, { key: 'reset' })).toEqual(settingDefaults);
  });

  it('replaces settings from a valid remote object while preserving drawer visibility', () => {
    const open: SettingsState = { ...settingDefaults, isOptionsPanelVisible: true };
    const replaced = settingReducer(open, {
      key: 'replace',
      settings: { themeMode: 'dark', accent: 'teal', numberOfDecks: '6', isOptionsPanelVisible: false },
    });
    expect(replaced).toEqual({
      ...settingDefaults,
      themeMode: 'dark',
      accent: 'teal',
      numberOfDecks: '6',
      isOptionsPanelVisible: true,
    });

    // invalid remote shapes are ignored
    expect(settingReducer(open, { key: 'replace', settings: { themeMode: 'neon' } })).toBe(open);
    expect(settingReducer(open, { key: 'replace', settings: {} })).toBe(open);
  });
});
