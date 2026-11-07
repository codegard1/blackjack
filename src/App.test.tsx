import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { webDarkTheme } from '@fluentui/react-components';
import { PlayingCardDeck } from './classes/PlayingCardDeck';
import { brandPresets, createAppTheme } from './theme';
import App from './App';
import { POT_BOUNCE_MS, POT_ENTER_MS, POT_LEAVE_MS } from './components/usePotMotion';
import { TOAST_EXIT_MS, TOAST_HOLD_MS } from './components/TableToasts';
import { formatNet } from './functions/format';
import { CHARACTER_HISTORY } from './functions/history';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  { humanCards: ['Spade_11', 'Diamond_14'], dealerCards: ['Club_10', 'Heart_7'], hit: false, humanStatus: '✨ Blackjack', dealerStatus: '💔 Loser', message: 'Chris: won $37 with blackjack. Faxe: paid out $37.' },
  { humanCards: ['Spade_10', 'Diamond_7'], dealerCards: ['Club_11', 'Heart_14'], hit: false, humanStatus: '💔 Loser', dealerStatus: '✨ Blackjack', message: 'Chris: lost $25. Faxe: took $25.' },
  { humanCards: ['Spade_10', 'Diamond_10'], dealerCards: ['Club_10', 'Heart_7'], hit: true, humanStatus: '💥 Busted', dealerStatus: '🏆 Winner', message: 'Chris: busted, lost $25. Faxe: took $25.' },
])('expires the result after three seconds: $message', ({ humanCards, dealerCards, hit, humanStatus, dealerStatus, message }) => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));
  }

  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.queryByText('New Round')).not.toBeInTheDocument();
  expect(screen.getByText(humanStatus)).toBeInTheDocument();
  expect(screen.getByText(dealerStatus)).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(2999));
  expect(screen.getByText(message)).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.queryByText(message)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));

  expect(screen.queryByText(message)).not.toBeInTheDocument();
  expect(screen.getByText('Round 2 started')).toBeInTheDocument();
});

it('replaces the controls with Next hand and Change players when the hand ends', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  expect(screen.getByRole('toolbar')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next hand' })).not.toBeInTheDocument();

  // busting ends the hand: the toolbar gives way to the end-of-hand buttons
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));
  expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Deal' })).not.toBeInTheDocument();

  // Change players opens the same dialog as the header button
  fireEvent.click(screen.getByRole('button', { name: 'Change players' }));
  expect(screen.getByRole('dialog', { name: 'Players' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  expect(screen.getByText('Round 2 started')).toBeInTheDocument();
  expect(screen.getByRole('toolbar')).toBeInTheDocument();
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
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

    toggleOgion();
    expect(within(screen.getByRole('dialog', { name: 'Players' })).getByText(/Changes apply from the next hand/)).toBeInTheDocument();
    closePlayers();
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();

    // still ignored when the hand ends
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));
    expect(screen.getByRole('button', { name: 'Next hand' })).toBeInTheDocument();
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).toBeInTheDocument();
    expect(screen.getByText('Round 2 started')).toBeInTheDocument();
  });

  it('updates the table at once when the roster changes between hands', () => {
    mockBustableHand();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));

    fireEvent.click(screen.getByRole('button', { name: 'Change players' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Players' })).getByRole('checkbox', { name: 'Ogion, The Rock' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Players' })).getByRole('checkbox', { name: 'Ogion, The Rock' }));
    expect(container.querySelector('[data-seat-key="ogion"]')).not.toBeInTheDocument();
  });
});

it('allows dismissing the result message before it expires', () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_11', 'Diamond_14'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  const message = screen.getByText('Chris: won $37 with blackjack. Faxe: paid out $37.');

  fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));

  expect(message).not.toBeInTheDocument();
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
  expect(screen.getByRole('button', { name: 'Draw one card from the top of the deck' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));

  expect(screen.getByRole('button', { name: 'Start game' })).toBeInTheDocument();
});

it('always shows card ranks and opens the activity log drawer by default from the setting', () => {
  vi.useFakeTimers();
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
  expect(screen.queryByRole('button', { name: 'Faxe (2)' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: "Chris's hand" })).toBeVisible();
  // the dealer's seat is collapsed while Chris is in control; its hand shows in the rail and its chip brings the seat forward
  expect(screen.getByRole('region', { name: "Faxe's hand" })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Faxe \(\$/ }));
  expect(screen.getByRole('region', { name: "Faxe's hand" })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Chris \(\$/ }));

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.queryByRole('switch', { name: 'Show Card Titles' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 2))).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  // the drawer starts closed, with its button always in the table's corner
  expect(screen.getByRole('button', { name: 'Activity log' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('heading', { name: 'Activity Log' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch', { name: 'Open Activity Log by default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  expect(cards().every((card) => Array.from(card.querySelectorAll('.playing-card-corner')).every((corner) => corner.children.length === 2))).toBe(true);
  expect(screen.getByRole('button', { name: 'Activity log' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('heading', { name: 'Activity Log' })).toBeInTheDocument();
  // the button is in the table's corner and the drawer hangs from the table's bottom edge
  expect(screen.getByRole('button', { name: 'Activity log' }).closest('.table-board')).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Activity Log' }).closest('.table-shell')).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Activity Log' }).closest('.table-board')).toBeNull();

  // the rows follow the toasts announcing them; once those have faded out they are all there
  act(() => vi.advanceTimersByTime(10 * (TOAST_HOLD_MS + TOAST_EXIT_MS)));
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

it('changes the theme, accent, card style and card back from the Appearance section and remembers them', () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  // FluentProvider writes the theme as CSS variables into a style sheet rule for its class
  const themeVariable = (name: string) => {
    const className = Array.from(document.querySelector('.fui-FluentProvider')?.classList ?? []).find((cls) => /^fui-FluentProvider\d*\w*_/.test(cls) || /^fui-FluentProvider_/.test(cls));
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && className && rule.selectorText.includes(className)) {
          return rule.style.getPropertyValue(name).trim();
        }
      }
    }
    return '';
  };
  const shell = () => document.querySelector('[data-theme-mode]') as HTMLElement;
  expect(shell()).toHaveAttribute('data-theme-mode', 'light');
  expect(themeVariable('--colorBrandBackground')).toBe(brandPresets.blue.ramp[80]);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(shell()).toHaveAttribute('data-theme-mode', 'dark');
  expect(themeVariable('--colorNeutralBackground1')).toBe(webDarkTheme.colorNeutralBackground1);

  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Accent color' })).getByRole('radio', { name: 'Teal' }));
  expect(themeVariable('--colorBrandBackground')).toBe(createAppTheme('dark', 'teal').colorBrandBackground);
  expect(shell()).toHaveAttribute('data-accent', 'teal');

  fireEvent.click(screen.getByRole('combobox', { name: 'Card style' }));
  fireEvent.click(screen.getByRole('option', { name: 'Bold' }));
  expect(screen.getByRole('combobox', { name: 'Card style' })).toHaveTextContent('Bold');

  fireEvent.click(screen.getByRole('radio', { name: 'Stripes' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Card back color' })).getByRole('radio', { name: 'Red' }));
  expect(screen.getByRole('img', { name: 'Card back preview: Stripes, Red' })).toHaveClass('is-pattern-stripes');
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = screen.getByRole('region', { name: "Chris's hand" }).querySelectorAll('.playing-card');
  expect(cards.length).toBeGreaterThan(0);
  cards.forEach((card) => expect(card).toHaveClass('is-style-bold'));
  const dealerBack = screen.getByRole('region', { name: "Faxe's hand" }).querySelector('.playing-card.is-back') as HTMLElement;
  expect(dealerBack).toHaveClass('is-pattern-stripes');
  expect(dealerBack.style.getPropertyValue('--card-back-primary')).toBe('var(--colorPaletteRedBackground3)');
  first.unmount();

  render(<App />);
  expect(shell()).toHaveAttribute('data-theme-mode', 'dark');
  expect(shell()).toHaveAttribute('data-accent', 'teal');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Stripes' })).toBeChecked();
  expect(within(screen.getByRole('radiogroup', { name: 'Accent color' })).getByRole('radio', { name: 'Teal' })).toBeChecked();
});

it('resets only the appearance settings', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Open Activity Log by default' }));
  fireEvent.click(screen.getByRole('radio', { name: 'High contrast' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Solid' }));
  expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'highContrast');

  fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
  expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'light');
  expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Rings' })).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Open Activity Log by default' })).toBeChecked();
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

/** the test setup reports reduced motion; pot animation tests need motion */
const allowMotion = () => {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ ...matchMedia(query), matches: false }));
};

it('keeps the pot in its corner and bounces it when a wager is made, holding play until it finishes', () => {
  allowMotion();
  const { container } = render(<App />);

  expect(container.querySelector('.table-pot-pregame-slot')).toBeInTheDocument();
  expect(screen.getByText('Pot: $0')).toBeInTheDocument();

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  // the new game's pot slides in from the top, then bounces for the ante; the controls wait
  // (only players ante, so one human player puts in $25)
  expect(screen.getByText('Pot: $25')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-entering')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  expect(container.querySelector('.table-pot-badge.is-bouncing')).not.toBeInTheDocument();
  const wager = screen.getByRole('button', { name: 'Wager $25' });
  expect(wager).not.toHaveAttribute('aria-disabled');

  fireEvent.click(wager);
  expect(screen.getByText('Pot: $50')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-shimmer')).toBeInTheDocument();

  // a click during the bounce does nothing
  fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
  expect(screen.getByText('Pot: $50')).toBeInTheDocument();

  // the pot never leaves its corner, even while its contribution toast is showing
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  // the ante and the wager are both $25, so their two notices can show at once
  expect(screen.getAllByText('+$25 added to the pot').length).toBeGreaterThan(0);
  expect(container.querySelectorAll('.table-pot')).toHaveLength(1);
  expect(container.querySelector('.table-pot-corner-slot')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).not.toHaveAttribute('aria-disabled');
  vi.useRealTimers();
});

it('keeps the pot after a hand ends, then slides it up and back in for the next hand', () => {
  allowMotion();
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_11', 'Diamond_14'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));

  // a natural blackjack ends the hand at once; the pot stays in its corner
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  expect(screen.getByText('Chris: won $37 with blackjack. Faxe: paid out $37.')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-corner-slot')).toHaveTextContent('Pot: $25');

  // the next hand: the last pot slides up out of view, showing its amount as it goes
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-leaving')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-corner-slot')).toHaveTextContent('Pot: $25');
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');

  // then the new hand's pot slides in from the top and bounces for the antes
  act(() => vi.advanceTimersByTime(POT_LEAVE_MS));
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-entering')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  expect(container.querySelector('.table-pot-corner-slot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  expect(container.querySelector('.table-pot-badge[class*="is-"]')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next hand' })).not.toHaveAttribute('aria-disabled');
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

  // the toasts before it take their turns first, each for the same time
  for (let waited = 0; !screen.queryByText("Faxe's turn") && waited < 10 * TOAST_HOLD_MS; waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(screen.getByText("Faxe's turn")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(TOAST_HOLD_MS + TOAST_EXIT_MS - 100));
  expect(screen.getByText("Faxe's turn")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText("Faxe's turn")).not.toBeInTheDocument();
});

it("shows the collapsed players' hands as cards in the rail during the human's turn", () => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const dealerHand = screen.getByRole('region', { name: "Faxe's hand" });
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

  // Chris has blackjack: 3:2 on a $25 stake wins $37
  const statsRow = (name: string) => {
    const table = screen.getByRole('table', { name: 'Player statistics' });
    const row = within(table).getAllByRole('row').find((candidate) => candidate.textContent?.startsWith(name));
    return within(row!).getAllByRole('cell').map((cell) => cell.textContent).slice(1);
  };

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  expect(statsRow('Chris')).toEqual(['1', '1', '0', '0', '100%', '1', '0', '+$37']);
  // Faxe's record is the simulated history plus this lost round, which paid Chris $37
  const history = CHARACTER_HISTORY.stats.dealer;
  const n = (value: number) => value.toLocaleString('en-US');
  const rounds = history.numberOfGamesPlayed + 1;
  const lost = history.numberOfGamesLost + 1;
  expect(statsRow('Faxe')).toEqual([
    n(rounds), n(history.numberOfGamesWon), n(lost), n(rounds - history.numberOfGamesWon - lost),
    `${Math.round((history.numberOfGamesWon / rounds) * 100)}%`,
    n(history.numberOfTimesBlackjack), n(history.numberOfTimesBusted), formatNet(history.netResult - 37),
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByText('Reset Game'));
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  expect(statsRow('Chris')[0]).toBe('1');
});

it('seats chosen computer players, who play their turns before the dealer', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.ogion.cards = ['Club_10', 'Heart_3'];
    this.playerHands.dealer.cards = ['Club_9', 'Heart_8'];
  });
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /Ogion/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

  expect(screen.getByText('Ogion ($1000)')).toBeInTheDocument();
  expect(screen.getByText('Thirteen is plenty.')).toBeInTheDocument();

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // Ogion has control and his seat comes forward; The Rock stands on 13
  expect(screen.getByRole('region', { name: "Ogion's hand" }).closest('.table-focus')).not.toBeNull();

  // computer play waits for the toasts announcing the earlier moves, so allow for them
  const hasFocus = (seat: string) => screen.getByRole('region', { name: `${seat}'s hand` }).closest('.table-focus') !== null;
  for (let waited = 0; waited < 20000 && !hasFocus('Faxe'); waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(hasFocus('Faxe')).toBe(true);
});

it("opens a character's card from the Players dialog", () => {
  render(<App />);

  // the Players dialog stays closed until it is opened
  expect(screen.queryByText('Computer players')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  fireEvent.click(screen.getByRole('button', { name: 'About Haber' }));

  const card = screen.getByRole('dialog', { name: 'Haber, The Maniac' });
  expect(within(card).getByRole('img', { name: /big man with a red-brown beard/ })).toBeInTheDocument();
  expect(within(card).getByText('Loose-aggressive')).toBeInTheDocument();
  expect(within(card).getByRole('meter', { name: 'Aggression' })).toHaveAttribute('aria-valuenow', '10');
  expect(within(card).getByText(/Ursula K. Le Guin/)).toBeInTheDocument();
});
