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
import { StoreName } from './enums';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([
  { humanCards: ['Spade_11', 'Diamond_14'], dealerCards: ['Club_10', 'Heart_7'], hit: false, humanStatus: '✨ Blackjack', dealerStatus: '💔 Loser', humanLog: 'won $37 with blackjack', dealerLog: 'paid out $37' },
  { humanCards: ['Spade_10', 'Diamond_7'], dealerCards: ['Club_11', 'Heart_14'], hit: false, humanStatus: '💔 Loser', dealerStatus: '✨ Blackjack', humanLog: 'lost $25', dealerLog: 'took $25' },
  { humanCards: ['Spade_10', 'Diamond_10'], dealerCards: ['Club_10', 'Heart_7'], hit: true, humanStatus: '💥 Busted', dealerStatus: '🏆 Winner', humanLog: 'busted, lost $25', dealerLog: 'took $25' },
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
  expect(screen.getByRole('region', { name: "Faxe's hand" }).querySelector('.playing-card.is-back')).toHaveAccessibleName('Face-down card');
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
  expect(screen.getByRole('img', { name: 'Card back preview: Stripes, Red' })).toHaveClass('is-pattern-stripes');
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const cards = screen.getByRole('region', { name: "Chris's hand" }).querySelectorAll('.playing-card');
  expect(cards).toHaveLength(2);
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
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck' }));
  checkRules(1, '3:2', 'stands on 17 or higher');

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

/** the test setup reports reduced motion; pot animation tests need motion */
const allowMotion = () => {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ ...matchMedia(query), matches: false }));
};

it('keeps the pot in the dock and bounces it when a wager is made, holding play until it finishes', () => {
  allowMotion();
  const { container } = render(<App />);

  // before a game the pot already waits in the dock, beside Start game
  expect(container.querySelector('.table-dock .table-pot')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start game' }).closest('.table-dock')).not.toBeNull();
  expect(screen.getByText('Pot: $0')).toBeInTheDocument();

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

  // the new game's pot slides in from the top, then bounces for the ante; the controls wait
  // (only players ante, so one human player puts in $25)
  expect(screen.getByText('Pot: $25')).toBeInTheDocument();
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-entering')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  expect(container.querySelector('.table-pot-badge.is-bouncing')).not.toBeInTheDocument();
  const wager = screen.getByRole('button', { name: 'Wager $25' });
  expect(wager).not.toHaveAttribute('aria-disabled');

  fireEvent.click(wager);
  expect(screen.getByText('Pot: $50')).toBeInTheDocument();
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-shimmer')).toBeInTheDocument();

  // a click during the bounce does nothing
  fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
  expect(screen.getByText('Pot: $50')).toBeInTheDocument();

  // the pot never leaves the dock, even while its contribution toast is showing
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  // the ante and the wager are both $25, so their two notices can show at once
  expect(screen.getAllByText('+$25 added to the pot').length).toBeGreaterThan(0);
  expect(container.querySelectorAll('.table-pot')).toHaveLength(1);
  expect(container.querySelector('.table-dock .table-pot')).toBeInTheDocument();
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

  // a natural blackjack ends the hand at once; the pot stays in the dock
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  expect(screen.getByText('✨ Blackjack')).toBeInTheDocument();
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $25');

  // the next hand: the last pot slides up out of view, showing its amount as it goes
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole('button', { name: 'Next hand' }));
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-leaving')).toBeInTheDocument();
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $25');
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');

  // then the new hand's pot slides in from the top and bounces for the antes
  act(() => vi.advanceTimersByTime(POT_LEAVE_MS));
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-entering')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-bouncing')).toBeInTheDocument();
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

it("shows the dealer's hand as cards on its bench during the human's turn", () => {
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
  // the dealer waits on its bench above the stage, not in the players' queue
  expect(dealerHand.closest('.table-bench')).not.toBeNull();
  expect(dealerHand.closest('.table-queue')).toBeNull();
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

  // Chris is on the stage, so Ogion leads the queue of seats still to play
  const queue = () => within(screen.getByRole('group', { name: 'Seats in turn order' }));
  expect(queue().getByText('Up next')).toBeInTheDocument();
  expect(queue().queryByText('Played')).not.toBeInTheDocument();
  expect(queue().getByRole('button', { name: /^Ogion \(\$/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // Chris has played and waits behind; no seat but the dealer is still to play
  expect(queue().getByText('Played')).toBeInTheDocument();
  expect(queue().queryByText('Up next')).not.toBeInTheDocument();
  expect(queue().getByRole('button', { name: /^Chris \(\$/ })).toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: 'Dealer' })).getByRole('button', { name: /^Faxe \(\$/ })).toBeInTheDocument();

  // Ogion has control and his seat comes forward; The Rock stands on 13
  expect(screen.getByRole('region', { name: "Ogion's hand" }).closest('.table-focus')).not.toBeNull();

  // while a computer seat plays, the dock names it in place of the human's buttons
  expect(screen.getByText('Ogion is playing').closest('.table-dock')).not.toBeNull();
  expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

  // computer play waits for the toasts announcing the earlier moves, so allow for them
  const hasFocus = (seat: string) => screen.getByRole('region', { name: `${seat}'s hand` }).closest('.table-focus') !== null;
  for (let waited = 0; waited < 20000 && !hasFocus('Faxe'); waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(hasFocus('Faxe')).toBe(true);
});

it('queues seats on the left by default, or on the right from the Seat queue side setting', () => {
  const { container } = render(<App />);
  expect(container.querySelector('.table-layout')).not.toHaveClass('is-queue-right');

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Seat queue side' })).getByRole('radio', { name: 'Right' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
  expect(container.querySelector('.table-layout')).toHaveClass('is-queue-right');

  // the choice outlasts the start of a game
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(container.querySelector('.table-layout')).toHaveClass('is-queue-right');
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
