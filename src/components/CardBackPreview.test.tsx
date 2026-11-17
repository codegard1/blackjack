import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingContext, settingDefaults } from '../context';
import { CardBackPreview } from './CardBackPreview';

describe('CardBackPreview', () => {
  it('previews the pattern and color from the settings with an accessible name', () => {
    render(
      <SettingContext.Provider value={{ ...settingDefaults, cardBackPattern: 'stripes', cardBackColor: 'green' }}>
        <CardBackPreview />
      </SettingContext.Provider>,
    );
    const preview = screen.getByRole('img', { name: 'Card back preview: Stripes, Green' });
    const back = preview.querySelector('.playing-card-face') as HTMLElement;
    expect(preview).toHaveClass('playing-card', 'is-preview');
    expect(back).toHaveClass('is-back', 'is-pattern-stripes');
    expect(back.style.getPropertyValue('--card-back-primary')).toBe('var(--colorPaletteGreenBackground3)');
  });

  it('previews a pattern and color given as props at the requested size', () => {
    render(<CardBackPreview pattern="checker" color="brand" height={120} />);
    const preview = screen.getByRole('img', { name: 'Card back preview: Checker, Accent' });
    const back = preview.querySelector('.playing-card-face') as HTMLElement;
    expect(back).toHaveClass('is-pattern-checker');
    expect(preview).toHaveStyle({ height: '120px', width: '78px' });
    expect(back.style.getPropertyValue('--card-back-secondary')).toBe('var(--colorBrandBackground2)');
  });
});
