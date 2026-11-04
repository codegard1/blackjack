import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState, GameContext, GameDispatchContext } from '../context';
import { GameAction, GameStatus } from '../enums';
import { gameReducer } from '../functions/gameReducer';
import { ControlPanel } from './ControlPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderControls = (gameStatus: GameStatus, currentPlayerKey: string, chrisCards: string[] = []) => {
  const state = gameReducer(createGameState(), {
    type: GameAction.NewGame,
    playerKey: ['chris', 'dealer'],
  });
  state.playerStore.ante('chris', state.minimumBet);
  state.deck.playerHands.chris.cards = chrisCards;
  state.gameStatus = gameStatus;
  state.playerStore.currentPlayerKey = currentPlayerKey;
  const dispatch = vi.fn();
  render(
    <GameContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>
        <ControlPanel
          playerKey="chris"
          hidden={false}
          isDeckCalloutVisible={false}
          playerStatusFlag={false}
          selectedFlag={false}
          showDeckCallout={vi.fn()}
        />
      </GameDispatchContext.Provider>
    </GameContext.Provider>,
  );
  return dispatch;
};

describe('player controls', () => {
  it.each([
    [GameStatus.HumanWins, 'chris'],
    [GameStatus.HumanWins, 'dealer'],
    [GameStatus.DealerWins, 'chris'],
    [GameStatus.DealerWins, 'dealer'],
    [GameStatus.Push, 'chris'],
    [GameStatus.GameOver, 'dealer'],
  ])('allows another deal after status %s with %s current', (status, currentPlayerKey) => {
    const dispatch = renderControls(status, currentPlayerKey);

    expect(screen.getByRole('button', { name: 'Deal' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wager $25' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Draw' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Deal });
  });

  it('enables gameplay on the human turn', () => {
    renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);

    screen.getAllByRole('button').forEach((button) => expect(button).toBeEnabled());
  });

  it('only offers double down on a two-card hand', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);
    fireEvent.click(screen.getByRole('button', { name: 'Double Down' }));
    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.DoubleDown, playerKey: 'chris' });

    cleanup();
    renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_2', 'Spade_3']);
    expect(screen.getByRole('button', { name: 'Double Down' })).toBeDisabled();
  });

  it('keeps all human controls disabled during the dealer turn', () => {
    renderControls(GameStatus.InProgress, 'dealer');

    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});