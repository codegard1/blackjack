import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
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

it('starts a new game with the selected player and the dealer', () => {
  render(<App />);

  // before the game starts, the seats for the next game float on the table
  expect(screen.getByText('Chris ($1000)')).toBeInTheDocument();
  expect(screen.getByText('Dealer ($1000)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  expect(screen.getByText('Chris ($975)')).toBeInTheDocument();
  expect(screen.getByText('Dealer ($975)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stay' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));

  expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
});

it('shows card ranks by default and toggles rank and activity visibility', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
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
  // the dealer's seat is collapsed while Chris is in control; its hand shows in the rail and its chip brings the seat forward
  expect(screen.getByRole('region', { name: "Dealer's hand" })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Dealer \(\$/ }));
  expect(screen.getByRole('region', { name: "Dealer's hand" })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Chris \(\$/ }));

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

it('hides the debug window by default and remembers the setting across reloads', () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

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
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  expect(screen.getByRole('heading', { level: 1, name: "Chris's Blackjack" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'About' }));
  const dialog = screen.getByRole('dialog', { name: "About Chris's Blackjack" });
  expect(dialog).toHaveTextContent(/Version \d/);
  expect(dialog).toHaveTextContent('Chris Odegard');

  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  expect(screen.queryByRole('dialog', { name: "About Chris's Blackjack" })).not.toBeInTheDocument();
});

it('opens and closes the in-app blackjack rules from the header', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
  const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
  expect(within(dialog).getByText(/minimum bet of \$25/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Double Down is available on your turn with exactly two cards/)).toBeInTheDocument();
  expect(within(dialog).getByText(/dealer draws below 17 and stands on 17 or higher/)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Blackjack rules' })).not.toBeInTheDocument();
});

it('floats the pot in the rail except while the contribution toast is visible', () => {
  const { container } = render(<App />);

  expect(container.querySelector('.table-pot-pregame-slot')).toBeInTheDocument();
  expect(screen.getByText('Pot: $0')).toBeInTheDocument();

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  expect(container.querySelector('.table-pot-center-slot')).not.toBeInTheDocument();
  expect(container.querySelector('.table-pot-rail-slot')).toBeInTheDocument();
  expect(screen.getByText('Pot: $50')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(900));
  expect(screen.getByText('+$50 added to the pot')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-center-slot')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(1400));
  expect(screen.getByText('+$50 added to the pot')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-center-slot')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(900));
  expect(container.querySelector('.table-pot-center-slot')).not.toBeInTheDocument();
  expect(container.querySelector('.table-pot-rail-slot')).toBeInTheDocument();
  vi.useRealTimers();
});

it("announces the dealer's turn as a toast that leaves on its own", () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  vi.useFakeTimers();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // the pot contribution toast takes its turn before the dealer's turn toast
  act(() => vi.advanceTimersByTime(1800));
  expect(screen.getByText("Dealer's turn")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByText("Dealer's turn")).not.toBeInTheDocument();
});

it("shows the collapsed players' hands as cards in the rail during the human's turn", () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const dealerHand = screen.getByRole('region', { name: "Dealer's hand" });
  const dealerCards = within(dealerHand).getAllByRole('button');
  expect(dealerCards).toHaveLength(2);
  // the hole card stays face down unless "Show Dealer Hand" is on
  expect(dealerCards[0].querySelectorAll('.playing-card-corner')).toHaveLength(0);
  expect(dealerCards[1].querySelectorAll('.playing-card-corner')).toHaveLength(2);
  expect(dealerHand.closest('.table-rail')).not.toBeNull();
  expect(screen.getByRole('region', { name: "Chris's hand" }).closest('.table-focus')).not.toBeNull();
});

it('creates a player, selects it for the next game, and starts with its name', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: 'Alex' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add player' }));
  // a new player is selected straight away
  expect(within(dialog).getByRole('radio', { name: 'Alex' })).toBeChecked();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

  expect(screen.getByText('Alex ($1000)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(screen.getByText('Alex ($975)')).toBeInTheDocument();
});

it('rejects a duplicate or empty player name', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: 'chris' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add player' }));
  expect(within(dialog).getByText('That name is already in use.')).toBeInTheDocument();

  fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: '   ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add player' }));
  expect(within(dialog).getByText('Enter a name.')).toBeInTheDocument();
});

it('carries a settled round into each player\'s statistics, including the next game', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_11', 'Diamond_14'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  // Chris has blackjack: a $25 stake, the $50 pot and a 3:2 bonus of $12
  const statsRow = (name: string) => {
    const table = screen.getByRole('table', { name: 'Player statistics' });
    const row = within(table).getAllByRole('row').find((candidate) => candidate.textContent?.startsWith(name));
    return within(row!).getAllByRole('cell').map((cell) => cell.textContent).slice(1);
  };

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  expect(statsRow('Chris')).toEqual(['1', '1', '0', '0', '100%', '1', '0', '$62']);
  expect(statsRow('Dealer')).toEqual(['1', '0', '1', '0', '0%', '0', '0', '$0']);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  expect(statsRow('Chris')[0]).toBe('1');
});
