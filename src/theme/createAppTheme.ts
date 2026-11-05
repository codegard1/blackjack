import { BrandVariants, Theme, createDarkTheme, createLightTheme, teamsHighContrastTheme } from '@fluentui/react-components';
import { AccentKey, SettingsState, ThemeMode } from '../types';
import { brandPresets } from './brand';

/** The theme that is actually rendered once 'system' is resolved */
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

/** Resolve the 'system' mode against the operating system preference */
export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}

/** Whether a resolved mode draws on a dark background */
export const isDarkMode = (mode: ResolvedThemeMode): boolean => mode !== 'light';

function darkThemeFor(ramp: BrandVariants): Theme {
  const theme = createDarkTheme(ramp);
  // Fluent's guidance for custom dark themes: lift the brand foregrounds for legibility
  theme.colorBrandForeground1 = ramp[110];
  theme.colorBrandForeground2 = ramp[120];
  return theme;
}

const cache = new Map<string, Theme>();

/**
 * Build the Fluent theme for the given mode and accent. High contrast ignores the
 * accent and uses Fluent's Teams high contrast theme. Themes are cached, so the
 * provider receives the same object for the same settings.
 */
export function createAppTheme(mode: ResolvedThemeMode, accent: AccentKey): Theme {
  if (mode === 'highContrast') return teamsHighContrastTheme;
  const key = `${mode}:${accent}`;
  let theme = cache.get(key);
  if (!theme) {
    const ramp = (brandPresets[accent] ?? brandPresets.blue).ramp;
    theme = mode === 'dark' ? darkThemeFor(ramp) : createLightTheme(ramp);
    cache.set(key, theme);
  }
  return theme;
}

/** The theme for the current settings and system preference */
export function themeForSettings(settings: Pick<SettingsState, 'themeMode' | 'accent'>, prefersDark: boolean): Theme {
  return createAppTheme(resolveThemeMode(settings.themeMode, prefersDark), settings.accent);
}
