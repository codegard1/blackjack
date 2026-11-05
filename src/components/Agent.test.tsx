import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameContext, GameDispatchContext, createGameState } from '../context';
import { GameAction, GameStatus } from '../enums';
import { IGameReducerAction } from '../interfaces';
import { Agent, DEALER_ACTION_DELAY_MS } from './Agent';

const createAgentTree = (
  gameState: ReturnType<typeof createGameState>,
  gameDispatch: (action: IGameReducerAction) => void,
  dealerHasControl: boolean,
) => (
  <GameContext.Provider value={gameState}>
    <GameDispatchContext.Provider value={gameDispatch}>
      <Agent
        dealerHasControl={dealerHasControl}
        gameStatus={gameState.gameStatus}
        handValue={{ aceAsEleven: 16, aceAsOne: 16, highest: 16 }}
        playerKey="dealer"
      />
    </GameDispatchContext.Provider>
  </GameContext.Provider>
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.500Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('dealer autoplay', () => {
  it('schedules only one draw across rerenders while the dealer owns the turn', () => {
    const gameState = createGameState();
    gameState.gameStatus = GameStatus.InProgress;
    gameState.dealerHasControl = true;
    const gameDispatch = vi.fn<(action: IGameReducerAction) => void>();
    const tree = createAgentTree(gameState, gameDispatch, true);
    const { rerender } = render(tree);

    rerender(createAgentTree(gameState, gameDispatch, true));
    act(() => vi.advanceTimersByTime(DEALER_ACTION_DELAY_MS));

    const drawCalls = gameDispatch.mock.calls.filter(([action]) => action.type === GameAction.Draw);
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0][0]).toMatchObject({
      playerKey: 'dealer',
      numberOfCards: 1,
    });
  });

  it('cancels a pending dealer action when control is removed', () => {
    const gameState = createGameState();
    gameState.gameStatus = GameStatus.InProgress;
    gameState.dealerHasControl = true;
    const gameDispatch = vi.fn<(action: IGameReducerAction) => void>();
    const { rerender } = render(createAgentTree(gameState, gameDispatch, true));

    gameState.dealerHasControl = false;
    rerender(createAgentTree(gameState, gameDispatch, false));
    act(() => vi.advanceTimersByTime(DEALER_ACTION_DELAY_MS));

    expect(gameDispatch).not.toHaveBeenCalled();
  });

  it('stands when the dealer total reaches seventeen', () => {
    const gameState = createGameState();
    gameState.gameStatus = GameStatus.InProgress;
    gameState.dealerHasControl = true;
    const gameDispatch = vi.fn<(action: IGameReducerAction) => void>();
    const { rerender } = render(createAgentTree(gameState, gameDispatch, true));

    rerender(
      <GameContext.Provider value={gameState}>
        <GameDispatchContext.Provider value={gameDispatch}>
          <Agent
            dealerHasControl
            gameStatus={gameState.gameStatus}
            handValue={{ aceAsEleven: 17, aceAsOne: 7, highest: 17 }}
            playerKey="dealer"
          />
        </GameDispatchContext.Provider>
      </GameContext.Provider>,
    );
    act(() => vi.advanceTimersByTime(DEALER_ACTION_DELAY_MS));

    expect(gameDispatch).toHaveBeenCalledWith({ type: GameAction.Stay, playerKey: 'dealer' });
  });
});
