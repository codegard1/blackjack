import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayingCard } from '../classes';
import { GameDispatchContext, SettingContext, settingDefaults } from '../context';
import { GameAction } from '../enums';
import { CardStyle, PlayingCardKey, SettingsState } from '../types';
import { CardContainer } from './CardContainer';
import { CARD_FLIP_MS } from './useCardFlip';

const renderCard = (key: PlayingCardKey, props: Partial<React.ComponentProps<typeof CardContainer>> = {}, settings: Partial<SettingsState> = {}, dispatch = vi.fn()) => {
  render(
    <SettingContext.Provider value={{ ...settingDefaults, ...settings }}>
      <GameDispatchContext.Provider value={dispatch}>
        <CardContainer {...new PlayingCard(key)} key={key} id={key} {...props} />
      </GameDispatchContext.Provider>
    </SettingContext.Provider>,
  );
  return screen.getByRole('button');
};

describe('CardContainer', () => {
  it('colors red and black suits through classes and keeps the classic frame', () => {
    const card = renderCard('Heart_5');
    expect(card).toHaveClass('playing-card', 'is-red', 'is-style-classic');
    expect(card).not.toHaveClass('is-face-down');
    expect(card.querySelector('.playing-card-face.is-face .playing-card-frame')).toBeInTheDocument();
  });

  it.each<[CardStyle, boolean, boolean]>([
    ['classic', true, false],
    ['minimal', false, false],
    ['bold', false, true],
  ])('lays out the %s face from the card style setting', (cardStyle, hasFrame, hasPip) => {
    const card = renderCard('Spade_12', {}, { cardStyle });
    expect(card).toHaveClass(`is-style-${cardStyle}`, 'is-black');
    expect(card.querySelectorAll('.playing-card-corner')).toHaveLength(2);
    expect(!!card.querySelector('.playing-card-frame')).toBe(hasFrame);
    expect(!!card.querySelector('.playing-card-pip-index')).toBe(hasPip);
    expect(card.querySelector('.playing-card-pip-index')?.textContent ?? 'Q').toBe('Q');
  });

  it('prefers a card style given as a prop over the setting', () => {
    expect(renderCard('Club_2', { cardStyle: 'bold' }, { cardStyle: 'minimal' })).toHaveClass('is-style-bold');
  });

  it('shows the description only when asked, under the bold pip', () => {
    renderCard('Diamond_14', { isDescVisible: true }, { cardStyle: 'bold' });
    const center = screen.getByRole('button').querySelector('.playing-card-center');
    expect(center?.textContent).toBe('A♦Ace');
  });

  it('renders a face-down card with no indices and an accessible name', () => {
    const card = renderCard('Club_10', { isBackFacing: true });
    const back = card.querySelector('.playing-card-face') as HTMLElement;
    expect(card).toHaveClass('is-face-down');
    expect(back).toHaveClass('is-back', 'is-pattern-rings');
    expect(card).toHaveAccessibleName('Face-down card');
    expect(card.querySelectorAll('.playing-card-corner, .playing-card-frame, .playing-card-center')).toHaveLength(0);
    expect(back.style.getPropertyValue('--card-back-primary')).toBe('var(--colorBrandBackground)');
  });

  it('names a face-up card by rank and suit', () => {
    expect(renderCard('Heart_12')).toHaveAccessibleName('Queen of Hearts');
  });

  it('draws the back from the pattern and color settings, or from props', () => {
    const card = renderCard('Club_10', { isBackFacing: true }, { cardBackPattern: 'lattice', cardBackColor: 'red' });
    const back = card.querySelector('.playing-card-face') as HTMLElement;
    expect(back).toHaveClass('is-pattern-lattice');
    expect(back.style.getPropertyValue('--card-back-primary')).toBe('var(--colorPaletteRedBackground3)');
    expect(back.style.getPropertyValue('--card-back-secondary')).toBe('var(--colorPaletteRedBackground1)');
    cleanup();

    const overridden = renderCard('Club_10', { isBackFacing: true, cardBackPattern: 'solid', cardBackColor: 'graphite' }, { cardBackPattern: 'lattice' });
    const overriddenBack = overridden.querySelector('.playing-card-face') as HTMLElement;
    expect(overriddenBack).toHaveClass('is-pattern-solid');
    expect(overriddenBack.style.getPropertyValue('--card-back-primary')).toBe('var(--colorNeutralForeground2)');
  });

  it('draws only the face it shows when it cannot flip', () => {
    expect(renderCard('Club_10').querySelectorAll('.playing-card-face')).toHaveLength(1);
    expect(screen.getByRole('button').querySelector('.is-back')).toBeNull();
    expect(screen.getByRole('button').querySelector('.playing-card-inner')).toBeNull();
    cleanup();

    renderCard('Club_10', { isBackFacing: true });
    expect(screen.getByRole('button').querySelectorAll('.playing-card-face')).toHaveLength(1);
    expect(screen.getByRole('button').querySelector('.is-face')).toBeNull();
  });

  describe('when flippable', () => {
    const flippable = (isBackFacing: boolean) => (
      <SettingContext.Provider value={settingDefaults}>
        <GameDispatchContext.Provider value={vi.fn()}>
          <CardContainer {...new PlayingCard('Spade_12')} key="Spade_12" id="Spade_12" isFlippable isBackFacing={isBackFacing} />
        </GameDispatchContext.Provider>
      </SettingContext.Provider>
    );

    it('keeps both faces on an inner layer, hidden from assistive technology', () => {
      render(flippable(true));
      const card = screen.getByRole('button');
      const inner = card.querySelector('.playing-card-inner') as HTMLElement;
      expect(card).toHaveClass('is-flippable', 'is-face-down');
      expect(Array.from(inner.children).map((face) => face.className.split(' ').filter((name) => ['is-face', 'is-back'].includes(name)).join())).toEqual(['is-face', 'is-back']);
      Array.from(inner.children).forEach((face) => expect(face).toHaveAttribute('aria-hidden', 'true'));
      expect(card).toHaveAccessibleName('Face-down card');
      expect(card.style.getPropertyValue('--card-flip-ms')).toBe(`${CARD_FLIP_MS}ms`);
    });

    it('turns over on the same element when isBackFacing changes, and renames itself', () => {
      const { rerender } = render(flippable(true));
      const card = screen.getByRole('button');
      const inner = card.querySelector('.playing-card-inner');
      rerender(flippable(false));
      expect(screen.getByRole('button')).toBe(card);
      expect(card.querySelector('.playing-card-inner')).toBe(inner);
      expect(card).not.toHaveClass('is-face-down');
      expect(card).toHaveAccessibleName('Queen of Spades');
      expect(card.querySelectorAll('.playing-card-face')).toHaveLength(2);
      rerender(flippable(true));
      expect(card).toHaveClass('is-face-down');
    });
  });

  it('toggles selection and dispatches when selectable', () => {
    const dispatch = vi.fn();
    const card = renderCard('Heart_9', { isSelectable: true }, {}, dispatch);
    expect(card).toHaveClass('is-selectable');
    expect(card).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(card).toHaveClass('is-selected');
    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Select, cardKey: 'Heart_9' });
    fireEvent.click(card);
    expect(dispatch).toHaveBeenLastCalledWith({ type: GameAction.Unselect, cardKey: 'Heart_9' });
  });

  it('is inert when not selectable', () => {
    const dispatch = vi.fn();
    const card = renderCard('Spade_3', {}, {}, dispatch);
    expect(card).not.toHaveAttribute('aria-pressed');
    fireEvent.click(card);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
