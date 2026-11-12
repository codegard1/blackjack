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
          <ControlPanel playerKey="chris" />
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
  ])('offers the next hand after status %s with %s current', (status, currentPlayerKey) => {
    const dispatch = renderControls(status, currentPlayerKey);

    // the toolbar gives way to the end-of-hand choices
    expect(screen.getByRole('button', { name: 'Next hand' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Change players' })).toBeEnabled();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stay' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: GameAction.Deal,
      tableRules: { numberOfDecks: '1', dealerSoft17: 'stand', blackjackPayout: '3:2' },
    });
  });

  it('enables gameplay on the human turn', () => {
    renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);

    ['Draw one card from the top of the deck (H)', 'Stay', 'Double Down', 'Wager $25'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: 'Deal' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Split' })).toBeDisabled();
  });

  it.each([
    ['h', ['Club_10', 'Heart_6'], { type: GameAction.Draw, playerKey: 'chris', numberOfCards: 1, deckSide: 'top' }],
    ['s', ['Club_10', 'Heart_6'], { type: GameAction.Stay, playerKey: 'chris' }],
    ['d', ['Club_10', 'Heart_6'], { type: GameAction.DoubleDown, playerKey: 'chris' }],
    ['w', [], { type: GameAction.Bet, playerKey: 'chris', betAmount: 25 }],
    ['n', [], { type: GameAction.Deal, tableRules: { numberOfDecks: '1', dealerSoft17: 'stand', blackjackPayout: '3:2' } }],
    ['Enter', [], { type: GameAction.Deal, tableRules: { numberOfDecks: '1', dealerSoft17: 'stand', blackjackPayout: '3:2' } }],
  ])('runs the %s keyboard shortcut when its action is enabled', (key, cards, expectedAction) => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', cards);

    fireEvent.keyDown(document.body, { key });

    expect(dispatch).toHaveBeenCalledWith(expectedAction);
  });

  it('ignores shortcuts while focus is in a text field', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);
    const input = document.createElement('input');
    document.body.append(input);

    fireEvent.keyDown(input, { key: 'h' });

    expect(dispatch).not.toHaveBeenCalled();
    input.remove();
  });

  it('focuses Next hand when the round ends and does not allow Deal during a hand', () => {
    renderControls(GameStatus.RoundOver, 'chris');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next hand' }));
    cleanup();

    const dispatch = renderControls(GameStatus.InProgress, 'chris', ['Club_10', 'Heart_6']);
    expect(screen.getByRole('button', { name: 'Deal' })).toBeDisabled();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('offers Split for a same-rank pair and dispatches the active hand index', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris', ['Club_8', 'Heart_8']);
    const split = screen.getByRole('button', { name: 'Split' });

    expect(split).toBeEnabled();
    fireEvent.click(split);
    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Split, playerKey: 'chris', handIndex: 0 });
  });

  it('keeps Hit and Stay disabled until the hand is dealt', () => {
    const dispatch = renderControls(GameStatus.InProgress, 'chris');

    expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
    expect(dispatch).toHaveBeenCalledWith({ type: GameAction.Bet, playerKey: 'chris', betAmount: 25 });
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