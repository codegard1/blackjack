import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState, GameContext, GameDispatchContext, PotAnimationContext, SettingContext, settingDefaults } from '../context';
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
    playerKeys: ['chris', 'dealer'],
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

describe('strategy hints', () => {
  /** The human's turn with these cards against a dealer showing `dealerUp`; the hole card is dealt first */
  const renderHand = (chrisCards: string[], dealerUp: string, options: { hints?: boolean; currentPlayerKey?: string; dealerSoft17?: 'stand' | 'hit'; numberOfDecks?: '1' | '2' | '6' | '8' } = {}) => {
    const { hints = true, currentPlayerKey = 'chris', dealerSoft17 = 'stand', numberOfDecks = '1' } = options;
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });
    state.playerStore.ante('chris', state.minimumBet);
    state.deck.playerHands.chris.cards = chrisCards;
    state.deck.playerHands.dealer.cards = ['Spade_13', dealerUp];
    state.gameStatus = GameStatus.InProgress;
    state.playerStore.currentPlayerKey = currentPlayerKey;
    state.tableRules = { ...state.tableRules, dealerSoft17, numberOfDecks };
    return render(
      <SettingContext.Provider value={{ ...settingDefaults, isStrategyHintVisible: hints }}>
        <GameContext.Provider value={state}>
          <ControlPanel playerKey="chris" />
        </GameContext.Provider>
      </SettingContext.Provider>,
    );
  };
  const hintedButtons = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-hint]')).map((button) => button.textContent);

  it('names the textbook play and marks its button, reading only the dealer\'s face-up card', () => {
    // the dealer's hole card is a king: a hint that counted it would see 19, not 9
    const { container } = renderHand(['Heart_14', 'Club_7'], 'Diamond_9');
    expect(screen.getByRole('status')).toHaveTextContent('Hint: Soft 18 vs dealer 9: hit');
    expect(hintedButtons(container)).toEqual(['Hit']);
  });

  it.each([
    { cards: ['Heart_10', 'Club_7'], dealerUp: 'Diamond_6', reason: 'Hard 17 vs dealer 6: stay', button: 'Stay' },
    { cards: ['Heart_5', 'Club_6'], dealerUp: 'Diamond_6', reason: 'Hard 11 vs dealer 6: double down', button: 'Double Down' },
    { cards: ['Heart_8', 'Club_8'], dealerUp: 'Diamond_10', reason: 'Pair of 8s vs dealer 10: split', button: 'Split' },
    // three cards cannot be doubled, so a hard 11 is hit
    { cards: ['Heart_5', 'Club_3', 'Spade_3'], dealerUp: 'Diamond_6', reason: 'Hard 11 vs dealer 6: hit', button: 'Hit' },
  ])('recommends $button for $reason', ({ cards, dealerUp, reason, button }) => {
    const { container } = renderHand(cards, dealerUp);
    expect(screen.getByRole('status')).toHaveTextContent(`Hint: ${reason}`);
    expect(hintedButtons(container)).toEqual([button]);
  });

  it('follows the rules of the table in play: the dealer on soft 17, and the number of decks', () => {
    renderHand(['Heart_14', 'Club_7'], 'Diamond_2', { numberOfDecks: '6' });
    expect(screen.getByRole('status')).toHaveTextContent('Soft 18 vs dealer 2: stay');
    cleanup();
    renderHand(['Heart_14', 'Club_7'], 'Diamond_2', { numberOfDecks: '6', dealerSoft17: 'hit' });
    expect(screen.getByRole('status')).toHaveTextContent('Soft 18 vs dealer 2: double down');
    cleanup();

    // one deck doubles an 8 against a 6; a shoe hits it
    renderHand(['Heart_3', 'Club_5'], 'Diamond_6', { numberOfDecks: '1' });
    expect(screen.getByRole('status')).toHaveTextContent('Hard 8 vs dealer 6: double down');
    cleanup();
    renderHand(['Heart_3', 'Club_5'], 'Diamond_6', { numberOfDecks: '8' });
    expect(screen.getByRole('status')).toHaveTextContent('Hard 8 vs dealer 6: hit');
  });

  it('shows nothing when hints are off, before the deal, or when it is not the human\'s turn', () => {
    const plain = renderHand(['Heart_14', 'Club_7'], 'Diamond_9', { hints: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(hintedButtons(plain.container)).toEqual([]);
    expect(plain.container.querySelector('.player-hinted')).toBeNull();
    // the toolbar is what it is without the feature: it stands alone, with Hit as the filled button
    expect(plain.container.firstElementChild).toBe(screen.getByRole('toolbar'));
    cleanup();

    renderHand([], 'Diamond_9');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    cleanup();

    renderHand(['Heart_14', 'Club_7'], 'Diamond_9', { currentPlayerKey: 'dealer' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});