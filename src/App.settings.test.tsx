import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { webDarkTheme } from '@fluentui/react-components';
import { PlayingCardDeck } from './classes/PlayingCardDeck';
import { brandPresets, createAppTheme } from './theme';
import App from './App';
import { StoreName } from './enums';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** let the toasts tell every seat's result, after which the game's buttons are free again; needs fake timers */
const finishResults = () => act(() => { vi.advanceTimersByTime(10_000); });

it('changes the theme, accent, card style and card back from the Appearance section and remembers them', () => {
  // neither hand is a natural, so the round stays in play and the dealer's hole card stays face down
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck) {
    this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
  });
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
  expect(shell()).toHaveAttribute('data-theme-mode', 'dark');
  expect(shell()).toHaveAttribute('data-accent', 'teal');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Stripes' })).toBeChecked();
  expect(within(screen.getByRole('radiogroup', { name: 'Accent color' })).getByRole('radio', { name: 'Teal' })).toBeChecked();
});

it.each(['Next hand', 'Options Deal'])('defers table rules through a reload until %s', (dealFrom) => {
  vi.spyOn(PlayingCardDeck.prototype, 'deal')
    .mockImplementationOnce(function (this: PlayingCardDeck) {
      this.playerHands.chris.cards = ['Spade_10', 'Diamond_9'];
      this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
    })
    .mockImplementation(function (this: PlayingCardDeck) {
      this.playerHands.chris.cards = ['Spade_10', 'Diamond_14_2'];
      this.playerHands.dealer.cards = ['Club_10', 'Heart_7'];
    });
  vi.spyOn(PlayingCardDeck.prototype, 'draw').mockReturnValue(['Heart_5']);
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Number of decks' })).getByRole('radio', { name: '2' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Dealer on soft 17' })).getByRole('radio', { name: 'Hit' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Blackjack pays' })).getByRole('radio', { name: '6:5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
  expect(screen.getByRole('radio', { name: '6:5' })).toBeChecked();
  first.unmount();

  vi.useFakeTimers();
  render(<App />);
  const checkRules = (decks: number, payout: string, dealerRule: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
    const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
    expect(dialog).toHaveTextContent(`active shoe uses ${decks} ${decks === 1 ? 'deck' : 'decks'}`);
    expect(dialog).toHaveTextContent(`natural blackjack is paid ${payout}`);
    expect(dialog).toHaveTextContent(dealerRule);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  };
  checkRules(1, '3:2', 'stands on 17 or higher');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(screen.getByRole('radio', { name: '2' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '6:5' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  checkRules(1, '3:2', 'stands on 17 or higher');

  finishResults();
  if (dealFrom === 'Options Deal') {
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start a new round with the selected players' }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  }
  checkRules(2, '6:5', 'draws below 17 and on soft 17');
  const game = JSON.parse(localStorage.getItem(StoreName.GAMESTORE) ?? '{}');
  expect(game.tableRules).toEqual({ numberOfDecks: '2', dealerSoft17: 'hit', blackjackPayout: '6:5' });
  const players = JSON.parse(localStorage.getItem(StoreName.PLAYERSTORE) ?? '{}');
  expect(players.players.chris.bank).toBe(1005);
});

it('uses table rules selected before starting a game', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('radio', { name: '8' }));
  fireEvent.click(screen.getByRole('radio', { name: '6:5' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Blackjack rules' }));
  const dialog = screen.getByRole('dialog', { name: 'Blackjack rules' });
  expect(dialog).toHaveTextContent('active shoe uses 8 decks');
  expect(dialog).toHaveTextContent('natural blackjack is paid 6:5');
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
