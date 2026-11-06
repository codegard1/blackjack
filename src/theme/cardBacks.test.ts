import { describe, expect, it } from 'vitest';
import { cardBackColors, cardBackPatterns } from '../types';
import { cardBackClassNames, cardBackColorList, cardBackColorPresets, cardBackColorVariables, cardBackPatternList, cardBackPatternPresets } from './cardBacks';

describe('card backs', () => {
  it('has a labeled preset for every pattern and color setting, in option order', () => {
    expect(cardBackPatternList.map((preset) => preset.key)).toEqual([...cardBackPatterns]);
    expect(cardBackColorList.map((preset) => preset.key)).toEqual([...cardBackColors]);
    cardBackPatternList.forEach((preset) => expect(preset.label).toBeTruthy());
    cardBackColorList.forEach((preset) => expect(preset.label).toBeTruthy());
  });

  it('maps a color to two theme tokens and the brand color to the accent', () => {
    expect(cardBackColorVariables('red')).toEqual({
      '--card-back-primary': `var(--${cardBackColorPresets.red.primary})`,
      '--card-back-secondary': `var(--${cardBackColorPresets.red.secondary})`,
    });
    expect(cardBackColorVariables('brand')).toEqual({
      '--card-back-primary': 'var(--colorBrandBackground)',
      '--card-back-secondary': 'var(--colorBrandBackground2)',
    });
  });

  it('selects a pattern class and falls back to rings for an unknown pattern', () => {
    expect(cardBackClassNames('lattice')).toEqual(['is-back', 'is-pattern-lattice']);
    expect(cardBackClassNames('plaid' as never)).toEqual(['is-back', 'is-pattern-rings']);
    expect(cardBackPatternPresets.solid.description).toContain('border');
  });
});
