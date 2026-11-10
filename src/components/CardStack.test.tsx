import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createGameState, GameContext, GameDispatchContext, SettingContext, settingDefaults } from '../context';
import { GameAction } from '../enums';
import { gameReducer } from '../functions/gameReducer';
import { CardStack } from './CardStack';

describe('CardStack', () => {
  it('keeps hand totals available to screen readers when visual totals are hidden', () => {
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });
    const player = state.playerStore.player('chris');
    const cards = ['Club_10', 'Heart_6'] as const;

    render(
      <GameContext.Provider value={state}>
        <GameDispatchContext.Provider value={vi.fn()}>
          <SettingContext.Provider value={{ ...settingDefaults, isHandValueVisible: false }}>
            <CardStack cards={[...cards]} hidden={false} isSelectable player={player} title={player.title} />
          </SettingContext.Provider>
        </GameDispatchContext.Provider>
      </GameContext.Provider>,
    );

    const hand = screen.getByRole('region', { name: "Chris's hand" });
    expect(hand).toHaveTextContent('Hand Value: 16');
    expect(hand.querySelector('.visually-hidden')).toHaveTextContent('Hand Value: 16');
  });
});
