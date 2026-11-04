import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlayingCardDeck } from './classes/PlayingCardDeck';
import App from './App';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  { humanCards: ['Spade_11', 'Diamond_14'], dealerCards: ['Club_10', 'Heart_7'], hit: false, message: 'Chris wins the round with blackjack.' },
  { humanCards: ['Spade_10', 'Diamond_7'], dealerCards: ['Club_11', 'Heart_14'], hit: false, message: 'Dealer wins the round with blackjack.' },
  { humanCards: ['Spade_10', 'Diamond_10'], dealerCards: ['Club_10', 'Heart_7'], hit: true, message: 'Chris busted. Dealer wins the round.' },
])('keeps the result visible until the next round: $message', ({ humanCards, dealerCards, hit, message }) => {
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

  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  if (hit) {
    vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));
  }

  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.queryByText('New Round')).not.toBeInTheDocument();

  vi.useFakeTimers();
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText(message)).toBeInTheDocument();
  vi.useRealTimers();

  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  expect(screen.queryByText(message)).not.toBeInTheDocument();
  expect(screen.getByText('New Round')).toBeInTheDocument();
});

it('starts a new game with the default human and dealer', () => {
  render(<App />);

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(screen.getByText('Dealer ($975)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
});

it('shows card ranks by default and toggles rank and activity visibility', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = () => Array.from(screen.getByRole('region', { name: "Chris's hand" }).querySelectorAll('button[aria-pressed]'));
  expect(cards()).toHaveLength(2);
  expect(cards().every((card) => (card.textContent?.trim().length ?? 0) > 1)).toBe(true);
  expect(cards()[0].querySelectorAll('.playing-card-corner')).toHaveLength(2);
  expect(cards()[0].querySelector('.playing-card-corner-bottom')).toHaveStyle({ transform: 'rotate(180deg)' });
  expect(cards()[0].querySelector('.playing-card-frame')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Chris (2)' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dealer (2)' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: "Chris's hand" })).toBeVisible();
  expect(screen.getByRole('region', { name: "Dealer's hand" })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Card Titles' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 1))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Card Titles' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Activity Log' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 2))).toBe(true);
  expect(screen.getByText('Activity Log')).toBeInTheDocument();
  expect(screen.getAllByText('was dealt two cards')).toHaveLength(2);
});

it('clears in-memory game state and returns to player selection', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear application data stored locally in the browser' }));

  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText('No players')).toBeInTheDocument();
});

it('resumes a saved game after a reload', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  first.unmount();

  const { container } = render(<App />);

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(container.querySelector('.PlayerContainer')?.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
});

it('hides the debug window by default and remembers the setting across reloads', () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));

  expect(screen.queryByRole('button', { name: 'Player Hands' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Show Debug Window' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  expect(screen.getByRole('button', { name: 'Player Hands' })).toBeInTheDocument();
  first.unmount();

  render(<App />);
  expect(screen.getByRole('button', { name: 'Player Hands' })).toBeInTheDocument();
});

it('shows the app name in the header and opens the About dialog', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));

  expect(screen.getByRole('heading', { level: 1, name: "Chris's Blackjack" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'About' }));
  const dialog = screen.getByRole('dialog', { name: "About Chris's Blackjack" });
  expect(dialog).toHaveTextContent(/Version \d/);
  expect(dialog).toHaveTextContent('Chris Odegard');

  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(screen.queryByRole('dialog', { name: "About Chris's Blackjack" })).not.toBeInTheDocument();
});
