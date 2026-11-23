import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { webDarkTheme } from '@fluentui/react-components';
import { dealCards, drawCards, emptyHand } from './functions/deck';
import { handValue } from './functions/getHandValue';
import { DeckState } from './types';
import { brandPresets, createAppTheme } from './theme';
import App from './App';
import { StoreName } from './enums';

vi.mock('./functions/deck', { spy: true });

const rigDeal = (hands: Record<string, string[]>) =>
  (deck: DeckState, _count?: number, keys?: readonly string[]): DeckState => {
    const playerHands = { ...deck.playerHands };
    for (const [key, cards] of Object.entries(hands)) {
      if (keys && !keys.includes(key)) continue;
      playerHands[key] = { ...(playerHands[key] ?? emptyHand()), cards: [...cards], handValue: handValue(cards) };
    }
    return { ...deck, playerHands };
  };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** let the toasts tell every seat's result, after which the game's buttons are free again; needs fake timers */
const finishResults = () => act(() => { vi.advanceTimersByTime(10_000); });

it('changes the theme, accent, card style and card back from the Appearance section and remembers them', async () => {
  // neither hand is a natural, so the round stays in play and the dealer's hole card stays face down
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
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
  expect(shell()).toHaveAttribute('data-theme-mode', 'dark');
  expect(themeVariable('--colorNeutralBackground1')).toBe(webDarkTheme.colorNeutralBackground1);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
  expect(shell()).toHaveAttribute('data-theme-mode', 'light');
  expect(themeVariable('--colorBrandBackground')).toBe(brandPresets.blue.ramp[80]);

  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Accent color' })).getByRole('radio', { name: 'Teal' }));
  expect(themeVariable('--colorBrandBackground')).toBe(createAppTheme('light', 'teal').colorBrandBackground);
  expect(shell()).toHaveAttribute('data-accent', 'teal');

  fireEvent.click(screen.getByRole('combobox', { name: 'Card style' }));
  fireEvent.click(screen.getByRole('option', { name: 'Bold' }));
  expect(screen.getByRole('combobox', { name: 'Card style' })).toHaveTextContent('Bold');

  fireEvent.click(screen.getByRole('radio', { name: 'Stripes' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Card back color' })).getByRole('radio', { name: 'Red' }));
  expect(screen.getByRole('img', { name: 'Card back preview: Stripes, Red' }).querySelector('.playing-card-face')).toHaveClass('is-pattern-stripes');
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = screen.getByRole('region', { name: "Chris's hand" }).querySelectorAll('.playing-card');
  expect(cards).toHaveLength(2);
  cards.forEach((card) => expect(card).toHaveClass('is-style-bold'));
  const dealerBack = screen.getByRole('region', { name: "Faxe's hand" }).querySelector('.playing-card.is-face-down .playing-card-face.is-back') as HTMLElement;
  expect(dealerBack).toHaveClass('is-pattern-stripes');
  expect(dealerBack.style.getPropertyValue('--card-back-primary')).toBe('var(--colorPaletteRedBackground3)');
  first.unmount();

  render(<App />);
  expect(shell()).toHaveAttribute('data-theme-mode', 'light');
  expect(shell()).toHaveAttribute('data-accent', 'teal');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Stripes' })).toBeChecked();
  expect(within(screen.getByRole('radiogroup', { name: 'Accent color' })).getByRole('radio', { name: 'Teal' })).toBeChecked();
});

it('defers table rules through a reload until Next hand', async () => {
  vi.mocked(dealCards)
    .mockImplementationOnce(rigDeal({ chris: ['Spade_10', 'Diamond_9'], dealer: ['Club_10', 'Heart_7'] }))
    .mockImplementation(rigDeal({ chris: ['Spade_10', 'Diamond_14_2'], dealer: ['Club_10', 'Heart_7'] }));
  vi.mocked(drawCards).mockImplementation((deck) => ({ deck, drawn: ['Heart_5'] }));
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Number of decks' })).getByRole('radio', { name: '2' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Dealer on soft 17' })).getByRole('radio', { name: 'Hit' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Blackjack pays' })).getByRole('radio', { name: '6:5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
  expect(screen.getByRole('radio', { name: '6:5' })).toBeChecked();
  first.unmount();

  vi.useFakeTimers();
  render(<App />);
  const checkRules = async (decks: number, payout: string, dealerRule: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
  await act(async () => { await vi.dynamicImportSettled(); });
    const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
    expect(dialog).toHaveTextContent(`active shoe uses ${decks} ${decks === 1 ? 'deck' : 'decks'}`);
    expect(dialog).toHaveTextContent(`natural blackjack is paid ${payout}`);
    expect(dialog).toHaveTextContent(dealerRule);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  };
  await checkRules(1, '3:2', 'stands on 17 or higher');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(screen.getByRole('radio', { name: '2' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '6:5' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  await checkRules(1, '3:2', 'stands on 17 or higher');

  finishResults();
  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  await checkRules(2, '6:5', 'draws below 17 and on soft 17');
  const game = JSON.parse(localStorage.getItem(StoreName.GAMESTORE) ?? '{}');
  expect(game.tableRules).toEqual({ numberOfDecks: '2', dealerSoft17: 'hit', blackjackPayout: '6:5' });
  const players = JSON.parse(localStorage.getItem(StoreName.PLAYERSTORE) ?? '{}');
  expect(players.players.chris.bank).toBe(1005);
});

it('uses table rules selected before starting a game', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('radio', { name: '8' }));
  fireEvent.click(screen.getByRole('radio', { name: '6:5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
  expect(dialog).toHaveTextContent('active shoe uses 8 decks');
  expect(dialog).toHaveTextContent('natural blackjack is paid 6:5');
});

it('resets only the appearance settings', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('switch', { name: 'Open Activity Log by default' }));
  fireEvent.click(screen.getByRole('radio', { name: 'High contrast' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Solid' }));
  expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'highContrast');

  fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
  expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'dark');
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
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

it('opens and closes the in-app blackjack rules from the header', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
  expect(within(dialog).getByText(/minimum bet of \$25/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Double Down is available on your turn with exactly two cards/)).toBeInTheDocument();
  expect(within(dialog).getByText(/dealer draws below 17 and stands on 17 or higher/)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Blackjack rules' })).not.toBeInTheDocument();
});

it('shows strategy hints once they are switched on in Options, and remembers the choice', async () => {
  // chris holds 16 against the dealer's 6 (the dealer's first card is the hole card)
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_6'],
    dealer: ['Club_10', 'Heart_6'],
  }));
  const hint = () => screen.queryByText('Hint: Hard 16 vs dealer 6: stay');
  const first = render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  // off by default: no hint, and Hit is the filled button as it always was
  expect(hint()).not.toBeInTheDocument();
  expect(first.container.querySelector('[data-hint]')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('switch', { name: 'Show strategy hints' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  expect(hint()).toBeInTheDocument();
  expect(first.container.querySelector('[data-hint]')).toBe(screen.getByRole('button', { name: 'Stay' }));

  // the hint follows the hand: a four makes 20, which stays
  vi.mocked(drawCards).mockImplementation((deck) => ({ deck, drawn: ['Heart_4'] }));
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  expect(hint()).not.toBeInTheDocument();
  expect(screen.getByText('Hint: Hard 20 vs dealer 6: stay')).toBeInTheDocument();

  first.unmount();
  render(<App />);
  expect(screen.getByText('Hint: Hard 20 vs dealer 6: stay')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(screen.getByRole('switch', { name: 'Show strategy hints' })).toBeChecked();
});

it('toggles gameplay and pot notifications in Options while preserving the pot breakdown and immediate log entries', async () => {
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  vi.mocked(drawCards).mockImplementation((deck) => ({ deck, drawn: ['Heart_5'] }));
  const first = render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  const gameplaySwitch = screen.getByRole('switch', { name: 'Gameplay notifications' });
  const potSwitch = screen.getByRole('switch', { name: 'Pot notifications' });
  expect(gameplaySwitch).toBeChecked();
  expect(potSwitch).toBeChecked();

  // Turn both off and open the Activity Log; Reset appearance must leave notification toggles alone
  fireEvent.click(gameplaySwitch);
  fireEvent.click(potSwitch);
  fireEvent.click(screen.getByRole('switch', { name: 'Open Activity Log by default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
  expect(gameplaySwitch).not.toBeChecked();
  expect(potSwitch).not.toBeChecked();
  first.unmount();

  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(screen.getByRole('switch', { name: 'Gameplay notifications' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Pot notifications' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  const log = () => within(document.getElementById('ActivityLogRoot') as HTMLElement);

  // Starting and wagering show no pot toast, while the log updates at once and tapping the pot still works
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(screen.queryByText('+$25 added to the pot')).not.toBeInTheDocument();
  expect(log().getByText('anted $25')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
  expect(screen.queryByText('Chris wagered $25')).not.toBeInTheDocument();
  expect(log().getByText('wagered $25')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Pot: \$50/ }));
  expect(container.querySelector('.table-toasts-pot')).toHaveTextContent('Chris: $50');

  // Busting produces no gameplay toast, Next hand is immediately free, and the log updates without waiting
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  expect(screen.queryByText('Chris busts!')).not.toBeInTheDocument();
  expect(screen.queryByText('Chris loses')).not.toBeInTheDocument();
  expect(screen.queryByText('Faxe wins!')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next hand' })).not.toHaveAttribute('aria-disabled');
  expect(log().getByText('busted, lost $50')).toBeInTheDocument();
});

it('toggles character animations from the Options panel and remembers the setting', async () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });

  const animationsSwitch = screen.getByRole('switch', { name: 'Character animations' });
  expect(animationsSwitch).toBeChecked();

  fireEvent.click(animationsSwitch);
  expect(animationsSwitch).not.toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  const dealerPortrait = screen.getByRole('region', { name: "Faxe's hand" });
  expect(dealerPortrait.querySelector('canvas')).toBeNull();

  first.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(screen.getByRole('switch', { name: 'Character animations' })).not.toBeChecked();
});
