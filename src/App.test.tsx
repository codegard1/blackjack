import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayingCardDeck } from './classes/PlayingCardDeck';
import App from './App';
import { TOAST_GAP_MS, TOAST_REVEAL_MS } from './components/TableToasts';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** let the toasts tell every seat's result, after which the game's buttons are free again; needs fake timers */
const finishResults = () => act(() => { vi.advanceTimersByTime(10_000); });

it.each([
  { humanCards: ['Spade_11', 'Diamond_14'], dealerCards: ['Club_10', 'Heart_7'], hit: false, humanStatus: '✨ Blackjack', dealerStatus: 'Dealer · 💔 Loser', humanLog: 'won $37 with blackjack', dealerLog: 'paid out $37' },
  { humanCards: ['Spade_10', 'Diamond_7'], dealerCards: ['Club_11', 'Heart_14'], hit: false, humanStatus: '💔 Loser', dealerStatus: 'Dealer · ✨ Blackjack', humanLog: 'lost $25', dealerLog: 'took $25' },
  { humanCards: ['Spade_10', 'Diamond_10'], dealerCards: ['Club_10', 'Heart_7'], hit: true, humanStatus: '💥 Busted', dealerStatus: 'Dealer · 🏆 Winner', humanLog: 'busted, lost $25', dealerLog: 'took $25' },
])('shows the result on the seats and in the activity log: $humanLog', ({ humanCards, dealerCards, hit, humanStatus, dealerStatus, humanLog, dealerLog }) => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal')
    .mockImplementationOnce(function (this: PlayingCardDeck) {
      this.playerHands.chris.cards = humanCards;
      this.playerHands.dealer.cards = dealerCards;
    })
    .mockImplementation(function (this: PlayingCardDeck) {
      this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
      this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
    });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  if (hit) {
    vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  }

  expect(screen.getByText(humanStatus)).toBeInTheDocument();
  expect(screen.getByText(dealerStatus)).toBeInTheDocument();
  // there is no message bar above the table
  expect(screen.queryByRole('button', { name: 'Dismiss message' })).not.toBeInTheDocument();

  // the log shows each entry once the table toasts for it have played
  const log = () => within(document.getElementById('ActivityLogRoot') as HTMLElement);
  act(() => vi.advanceTimersByTime(30_000));
  expect(log().getByText(humanLog)).toBeInTheDocument();
  expect(log().getByText(dealerLog)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  act(() => vi.advanceTimersByTime(30_000));
  expect(log().getByText('Round 2 started')).toBeInTheDocument();
});

it('replaces the controls with Next hand and Change players when the hand ends', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });

  vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
  vi.useFakeTimers();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  // until the deal, the human's seat explains the wager; the buttons are in the dock, not the seat
  const hint = screen.getByText('Before dealing, use Wager to add $25 to your stake. You can add more than once.');
  expect(hint.closest('.table-focus')).not.toBeNull();
  expect(screen.getByRole('toolbar').closest('.table-dock')).not.toBeNull();
  expect(screen.getByRole('toolbar').closest('.table-focus')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  expect(screen.queryByText(/Before dealing/)).not.toBeInTheDocument();
  expect(screen.getByRole('toolbar')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next hand' })).not.toBeInTheDocument();

  // busting ends the hand: the toolbar gives way to the end-of-hand buttons
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Deal' })).not.toBeInTheDocument();

  // the buttons wait while the toasts tell each seat's result
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');
  finishResults();
  expect(screen.getByRole('button', { name: 'Next hand' })).not.toHaveAttribute('aria-disabled');

  // Change players opens the same dialog as the header button
  fireEvent.click(screen.getByRole('button', { name: 'Change players' }));
  expect(screen.getByRole('dialog', { name: 'Players' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  expect(screen.getByRole('toolbar')).toBeInTheDocument();
});

it('shows both split hands and marks the hand in control', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Club_8', 'Heart_8'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  vi.spyOn(PlayingCardDeck.prototype, 'draw')
    .mockReturnValueOnce(['Spade_2'])
    .mockReturnValueOnce(['Diamond_3']);
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Split' }));

  expect(screen.getByText('Hand 1 · Active')).toBeInTheDocument();
  expect(screen.getByText('Hand 2')).toBeInTheDocument();

  vi.useFakeTimers();
  act(() => vi.advanceTimersByTime(30_000));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));
  expect(screen.getByText('Hand 2 · Active')).toBeInTheDocument();
});

describe('changing the roster', () => {
  const mockBustableHand = () => {
    vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
      this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
      this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
    });
    vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
  };
  const toggleOgion = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Players' })).getByRole('checkbox', { name: 'Ogion, The Rock' }));
  };
  const closePlayers = () => fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  it('ignores roster changes while a hand is in play, then seats them for the next hand', () => {
    mockBustableHand();
    vi.useFakeTimers();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

    toggleOgion();
    expect(within(screen.getByRole('dialog', { name: 'Players' })).getByText(/Changes apply from the next hand/)).toBeInTheDocument();
    closePlayers();
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();

    // still ignored when the hand ends
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
    expect(screen.getByRole('button', { name: 'Next hand' })).toBeInTheDocument();
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();

    finishResults();
    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).toBeInTheDocument();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('updates the table at once when the roster changes between hands', () => {
    mockBustableHand();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));

    fireEvent.click(screen.getByRole('button', { name: 'Change players' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Players' })).getByRole('checkbox', { name: 'Ogion, The Rock' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Players' })).getByRole('checkbox', { name: 'Ogion, The Rock' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();
  });
});

it('starts a new game with the selected player and the dealer', () => {
  render(<App />);

  // before the game starts, the seats for the next game float on the table
  expect(screen.getByText('Chris ($1000)')).toBeInTheDocument();
  expect(screen.getByText('Faxe ($1000)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  // every player antes; the dealer does not
  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(screen.getByText('Faxe ($1000)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));

  expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
});

it('always shows card ranks and opens the activity log drawer by default from the setting', () => {
  vi.useFakeTimers();
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = () => Array.from(screen.getByRole('region', { name: "Chris's hand" }).querySelectorAll('button[aria-pressed]'));
  expect(cards()).toHaveLength(2);
  const activeHand = cards()[0].closest('.player-hand')?.firstElementChild?.firstElementChild as HTMLElement;
  expect(getComputedStyle(activeHand).flexGrow).toBe('1');
  expect(getComputedStyle(activeHand).width).not.toBe('0px');
  expect(cards().every((card) => (card.textContent?.trim().length ?? 0) > 1)).toBe(true);
  expect(cards()[0].querySelectorAll('.playing-card-corner')).toHaveLength(2);
  expect(cards()[0].querySelector('.playing-card-corner-bottom')).toHaveStyle({ transform: 'rotate(180deg)' });
  expect(cards()[0].querySelector('.playing-card-frame')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chris (2)' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Faxe (2)' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: "Chris's hand" })).toBeVisible();
  // the dealer's seat is collapsed while Chris is in control; its hand shows on its bench and its chip brings the seat forward
  expect(screen.getByRole('region', { name: "Faxe's hand" })).toBeVisible();
  expect(screen.getByRole('region', { name: "Faxe's hand" }).querySelector('.playing-card.is-face-down')).toHaveAccessibleName('Face-down card');
  fireEvent.click(screen.getByRole('button', { name: /^Faxe \(\$/ }));
  expect(screen.getByRole('region', { name: "Faxe's hand" })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Chris \(\$/ }));

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.queryByRole('switch', { name: 'Show Card Titles' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 2))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  // the drawer starts closed, with its button always at the end of the dock
  expect(screen.getByRole('button', { name: 'Activity log' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch', { name: 'Open Activity Log by default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 2))).toBe(true);
  expect(screen.getByRole('button', { name: 'Activity log' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument();
  // the button is in the dock and the drawer hangs from the table's bottom edge
  expect(screen.getByRole('button', { name: 'Activity log' }).closest('.table-dock')).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Activity Log' }).closest('.table-shell')).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Activity Log' }).closest('.table-board')).toBeNull();

  // the rows follow the toasts announcing them; once those have had their moment they are all there
  act(() => vi.advanceTimersByTime(10 * (TOAST_GAP_MS + TOAST_REVEAL_MS)));
  expect(screen.getAllByText('was dealt two cards')).toHaveLength(2);
});

it('clears in-memory game state and returns to player selection', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear application data stored locally in the browser' }));

  expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
  expect(screen.getByText('Chris ($1000)')).toBeInTheDocument();
});

it('resumes a saved game after a reload', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  first.unmount();

  const { container } = render(<App />);

  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(container.querySelector('.PlayerContainer')?.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
});
