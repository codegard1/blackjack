import { TableRules, blackjackPayouts, dealerSoft17Options, deckCounts } from './TableRules';

/** How the Fluent UI theme is chosen */
export const themeModes = ['light', 'dark', 'system', 'highContrast'] as const;
export type ThemeMode = typeof themeModes[number];

/** Brand color presets the theme is built from */
export const accentKeys = ['blue', 'teal', 'green', 'crimson', 'violet'] as const;
export type AccentKey = typeof accentKeys[number];

/** Playing card face presets */
export const cardStyles = ['classic', 'minimal', 'bold'] as const;
export type CardStyle = typeof cardStyles[number];

/** Playing card back patterns */
export const cardBackPatterns = ['rings', 'lattice', 'stripes', 'checker', 'solid'] as const;
export type CardBackPattern = typeof cardBackPatterns[number];

/** Playing card back colors; 'brand' follows the accent color */
export const cardBackColors = ['brand', 'red', 'blue', 'green', 'graphite'] as const;
export type CardBackColor = typeof cardBackColors[number];

/** The side of the table where seats queue for their turn */
export const queueSides = ['left', 'right'] as const;
export type QueueSide = typeof queueSides[number];

/**
 * Object containing all app settings
 */
export type SettingsState = TableRules & {
  isActivityLogVisible: boolean;
  isCardDescVisible: boolean;
  isDealerHandVisible: boolean;
  isDeckVisible: boolean;
  isDrawnVisible: boolean;
  isHandValueVisible: boolean;
  isOptionsPanelVisible: boolean;
  isSelectedVisible: boolean;
  themeMode: ThemeMode;
  accent: AccentKey;
  cardStyle: CardStyle;
  cardBackPattern: CardBackPattern;
  cardBackColor: CardBackColor;
  queueSide: QueueSide;
}

export type SettingKey = keyof SettingsState;

/** Allowed values for every setting that is not a boolean */
export const settingOptions = {
  themeMode: themeModes,
  accent: accentKeys,
  cardStyle: cardStyles,
  cardBackPattern: cardBackPatterns,
  cardBackColor: cardBackColors,
  queueSide: queueSides,
  numberOfDecks: deckCounts,
  dealerSoft17: dealerSoft17Options,
  blackjackPayout: blackjackPayouts,
} as const satisfies Partial<Record<SettingKey, readonly string[]>>;

/** The settings that shape the theme, cards and card backs */
export const appearanceSettingKeys = ['themeMode', 'accent', 'cardStyle', 'cardBackPattern', 'cardBackColor'] as const;
