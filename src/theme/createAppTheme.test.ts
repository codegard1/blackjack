import { teamsHighContrastTheme, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import { accentKeys } from '../types';
import { brandPresets } from './brand';
import { createAppTheme, resolveThemeMode, themeForSettings } from './createAppTheme';

describe('createAppTheme', () => {
  it('matches Fluent web themes for the default blue accent', () => {
    expect(createAppTheme('light', 'blue').colorBrandBackground).toBe(webLightTheme.colorBrandBackground);
    expect(createAppTheme('dark', 'blue').colorNeutralBackground1).toBe(webDarkTheme.colorNeutralBackground1);
    expect(createAppTheme('highContrast', 'teal')).toBe(teamsHighContrastTheme);
  });

  it('gives every accent its own brand color and a dark variant', () => {
    const lightBrands = accentKeys.map((accent) => createAppTheme('light', accent).colorBrandBackground);
    expect(new Set(lightBrands).size).toBe(accentKeys.length);
    accentKeys.forEach((accent) => {
      const ramp = brandPresets[accent].ramp;
      expect(createAppTheme('light', accent).colorBrandBackground).toBe(ramp[80]);
      expect(createAppTheme('dark', accent).colorBrandForeground1).toBe(ramp[110]);
    });
  });

  it('returns the same theme object for the same settings', () => {
    expect(createAppTheme('light', 'teal')).toBe(createAppTheme('light', 'teal'));
  });

  it('follows the system preference only in system mode', () => {
    expect(resolveThemeMode('system', true)).toBe('dark');
    expect(resolveThemeMode('system', false)).toBe('light');
    expect(resolveThemeMode('light', true)).toBe('light');
    expect(themeForSettings({ themeMode: 'system', accent: 'blue' }, true)).toBe(createAppTheme('dark', 'blue'));
  });
});
