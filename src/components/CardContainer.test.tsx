import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayingCard } from '../classes';
import { GameDispatchContext, SettingContext, settingDefaults } from '../context';
import { GameAction } from '../enums';
import { CardStyle, PlayingCardKey, SettingsState } from '../types';
import { CardContainer } from './CardContainer';

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
    expect(renderCard('Heart_5')).toHaveClass('playing-card', 'is-face', 'is-red', 'is-style-classic');
    expect(screen.getByRole('button').querySelector('.playing-card-frame')).toBeInTheDocument();
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
    expect(card).toHaveClass('is-back');
    expect(card).toHaveAccessibleName('Ten of Clubs');
    expect(card.querySelectorAll('.playing-card-corner, .playing-card-frame, .playing-card-center')).toHaveLength(0);
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
