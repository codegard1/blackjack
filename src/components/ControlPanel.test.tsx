import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState, GameContext, GameDispatchContext, PotAnimationContext } from '../context';
import { GameAction, GameStatus } from '../enums';
import { gameReducer } from '../functions/gameReducer';
import { ControlPanel } from './ControlPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderControls = (gameStatus: GameStatus, currentPlayerKey: string, chrisCards: string[] = [], isPotBouncing = false) => {
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
        <PotAnimationContext.Provider value={isPotBouncing}>
          <ControlPanel
            playerKey="chris"
            hidden={false}
            isDeckCalloutVisible={false}
            playerStatusFlag={false}
            selectedFlag={false}
            showDeckCallout={vi.fn()}
          />
        </PotAnimationContext.Provider>
      </GameDispatchContext.Provider>
    </GameContext.Provider>,
  );
  return dispatch;
};

describe('player controls', () => {
  it('waits for the pot to finish bouncing, keeping the controls focusable', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', [], true);
    const wager = screen.getByRole('button', { name: 'Wager $25' });

    expect(wager).toHaveAttribute('aria-disabled', 'true');
    expect(wager).not.toBeDisabled();
    fireEvent.click(wager);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    [GameStatus.RoundOver, 'chris'],
    [GameStatus.RoundOver, 'dealer'],
    [GameStatus.GameOver, 'chris'],
    [GameStatus.GameOver, 'dealer'],
  ])('allows another deal after status %s with %s current', (status, currentPlayerKey) => {
    const dispatch = renderControls(status, currentPlayerKey);

    expect(screen.getByRole('button', { name: 'Deal' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wager $25' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Draw' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Deal });
  });

  it('enables gameplay on the human turn', () => {
    renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);

    screen.getAllByRole('button').forEach((button) => expect(button).toBeEnabled());
  });

  it('keeps Hit and Stay disabled until the hand is dealt', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris');

    expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
    expect(screen.getByText('Before dealing, use Wager to add $25 to your stake. You can add more than once.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Bet, playerKey: 'chris', betAmount: 25 });
  });

  it('only offers double down on a two-card hand', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);
    expect(screen.queryByText(/Before dealing/)).not.toBeInTheDocument();
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