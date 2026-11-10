import { teamsHighContrastTheme, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import { accentKeys } from '../types';
import { brandPresets } from './brand';
import { createAppTheme, resolveThemeMode, themeForSettings } from './createAppTheme';

const luminance = (color: string): number => {
  const [red, green, blue] = color.match(/[a-f\d]{2}/gi)!.slice(0, 3)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((first, second) => second - first);
  return (lighter + 0.05) / (darker + 0.05);
};

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

  it('keeps table surfaces, chips, pot, and toast colors readable in every theme', () => {
    for (const mode of ['light', 'dark', 'highContrast'] as const) {
      for (const accent of accentKeys) {
        const theme = createAppTheme(mode, accent);
        const pairs: [string, string][] = [
          [theme.colorNeutralForeground1, theme.colorNeutralBackground3],
          [theme.colorNeutralForeground1, theme.colorNeutralBackground1],
          [theme.colorNeutralForeground3, theme.colorNeutralBackground1],
          [theme.colorPaletteRedForeground1, theme.colorNeutralBackground1],
          [theme.colorBrandForeground2, theme.colorBrandBackground2],
          [theme.colorNeutralForegroundOnBrand, theme.colorBrandBackground],
          [theme.colorNeutralForeground1, theme.colorNeutralBackground3],
          [theme.colorNeutralForegroundOnBrand, theme.colorPaletteRedBackground3],
          [theme.colorNeutralForegroundOnBrand, theme.colorPaletteGreenBackground3],
          [theme.colorPaletteBlueForeground2, theme.colorPaletteBlueBackground2],
        ];

        pairs.forEach(([foreground, background]) => {
          expect(contrastRatio(foreground, background), `${mode}/${accent}: ${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });
});
