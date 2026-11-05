import { ThemeMode, themeModes } from '../types';

export interface ThemeModePreset {
  key: ThemeMode;
  label: string;
}

/** How the theme is chosen, as shown in the options panel */
export const themeModePresets: Record<ThemeMode, ThemeModePreset> = {
  light: { key: 'light', label: 'Light' },
  dark: { key: 'dark', label: 'Dark' },
  system: { key: 'system', label: 'System' },
  highContrast: { key: 'highContrast', label: 'High contrast' },
};

/** The presets in option order */
export const themeModeList = themeModes.map((key) => themeModePresets[key]);
