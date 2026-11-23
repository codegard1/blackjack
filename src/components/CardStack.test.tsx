import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createGameState, GameContext, GameDispatchContext, GameStatusContext, SettingContext, settingDefaults } from '../context';
import { GameAction } from '../enums';
import { gameReducer } from '../functions/gameReducer';
import { CardStack } from './CardStack';

describe('CardStack', () => {
  it('keeps hand totals available to screen readers when visual totals are hidden', () => {
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });
    const player = state.playerStore.players.chris;
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

  it('does not re-render when unrelated GameContext fields change', () => {
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });
    const player = state.playerStore.players.chris;
    const cards = ['Club_10', 'Heart_6'];
    const onRender = vi.fn();
    const dispatch = vi.fn();

    const MemoStack = React.memo(() => (
      <React.Profiler id="stack" onRender={onRender}>
        <CardStack cards={cards} hidden={false} isSelectable={false} player={player} title={player.title} />
      </React.Profiler>
    ));

    const tree = (gameState: typeof state) => (
      <GameContext.Provider value={gameState}>
        <GameStatusContext.Provider value={gameState.gameStatus}>
          <GameDispatchContext.Provider value={dispatch}>
            <SettingContext.Provider value={settingDefaults}>
              <MemoStack />
            </SettingContext.Provider>
          </GameDispatchContext.Provider>
        </GameStatusContext.Provider>
      </GameContext.Provider>
    );

    const { rerender } = render(tree(state));
    expect(onRender).toHaveBeenCalledTimes(1);

    // Changing pot/round in GameContext while gameStatus and props are unchanged should not re-render CardStack
    rerender(tree({ ...state, pot: state.pot + 25 }));
    expect(onRender).toHaveBeenCalledTimes(1);
  });
});
