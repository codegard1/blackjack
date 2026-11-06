import { CardBackColor, CardBackPattern, cardBackColors, cardBackPatterns } from '../types';

/**
 * Card back design system. A back is the product of two independent axes: a
 * pattern, drawn in CardContainer.css from the custom properties
 * --card-back-primary (the body) and --card-back-secondary (the lines), and a
 * color, which assigns Fluent theme tokens to those two properties. Every color
 * is a pair of tokens, so backs follow light and dark mode and high contrast.
 */

export interface CardBackPatternPreset {
  key: CardBackPattern;
  label: string;
  description: string;
}

export interface CardBackColorPreset {
  key: CardBackColor;
  label: string;
  /** theme token for the body of the back */
  primary: string;
  /** theme token for the lines of the pattern */
  secondary: string;
}

export const cardBackPatternPresets: Record<CardBackPattern, CardBackPatternPreset> = {
  rings: { key: 'rings', label: 'Rings', description: 'Overlapping circles' },
  lattice: { key: 'lattice', label: 'Lattice', description: 'A diagonal grid' },
  stripes: { key: 'stripes', label: 'Stripes', description: 'Diagonal stripes' },
  checker: { key: 'checker', label: 'Checker', description: 'A checkerboard' },
  solid: { key: 'solid', label: 'Solid', description: 'A plain back with a border' },
};

export const cardBackColorPresets: Record<CardBackColor, CardBackColorPreset> = {
  brand: { key: 'brand', label: 'Accent', primary: 'colorBrandBackground', secondary: 'colorBrandBackground2' },
  red: { key: 'red', label: 'Red', primary: 'colorPaletteRedBackground3', secondary: 'colorPaletteRedBackground1' },
  blue: { key: 'blue', label: 'Blue', primary: 'colorPaletteBlueBorderActive', secondary: 'colorPaletteBlueBackground2' },
  green: { key: 'green', label: 'Green', primary: 'colorPaletteGreenBackground3', secondary: 'colorPaletteGreenBackground1' },
  graphite: { key: 'graphite', label: 'Graphite', primary: 'colorNeutralForeground2', secondary: 'colorNeutralBackground1' },
};

/** The presets in option order */
export const cardBackPatternList = cardBackPatterns.map((key) => cardBackPatternPresets[key]);
export const cardBackColorList = cardBackColors.map((key) => cardBackColorPresets[key]);

/** The CSS custom properties a color preset sets on a card back */
export function cardBackColorVariables(color: CardBackColor): React.CSSProperties {
  const preset = cardBackColorPresets[color] ?? cardBackColorPresets.brand;
  return {
    '--card-back-primary': `var(--${preset.primary})`,
    '--card-back-secondary': `var(--${preset.secondary})`,
  } as React.CSSProperties;
}

/** The classes that select a pattern on a face-down card */
export function cardBackClassNames(pattern: CardBackPattern): string[] {
  return ['is-back', `is-pattern-${pattern in cardBackPatternPresets ? pattern : 'rings'}`];
}
