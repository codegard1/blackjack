import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlayingCardDeck } from './classes/PlayingCardDeck';
import App from './App';
import { formatNet } from './functions/format';
import { CHARACTER_HISTORY } from './functions/history';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
  const { container } = render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /Ogion/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

  expect(screen.getByText('Ogion ($1000)')).toBeInTheDocument();
  expect(screen.getByText('Thirteen is plenty.')).toBeInTheDocument();

  // before the game the seats float together in the reverse of turn order: the dealer first, tagged as the dealer
  const seatsIn = (group: string) => Array.from(container.querySelectorAll<HTMLElement>(`${group} [data-seat-key]`)).map((slot) => slot.dataset.seatKey);
  expect(seatsIn('.table-waiting')).toEqual(['dealer', 'ogion', 'chris']);
  expect(within(container.querySelector('.table-waiting') as HTMLElement).getByText('Dealer')).toBeInTheDocument();

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  // Chris, who plays first, is on the stage; the seats still to play wait above it with no headings,
  // the dealer, who plays last, at the top and Ogion, who plays next, closest to the stage
  expect(seatsIn('.table-waiting')).toEqual(['dealer', 'ogion']);
  expect(container.querySelector('.table-played')).toBeNull();
  ['Up next', 'Played', 'Turn order'].forEach((heading) => expect(screen.queryByText(heading)).not.toBeInTheDocument());
  expect(screen.queryByText('Dealer', { selector: 'span:not([class*="Badge"])' })).not.toBeInTheDocument();
  expect(container.querySelector('.table-focus')).toContainElement(screen.getByRole('region', { name: "Chris's hand" }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // Chris has played and moves below the stage; only the dealer is still to play above it
  expect(seatsIn('.table-waiting')).toEqual(['dealer']);
  expect(seatsIn('.table-played')).toEqual(['chris']);
  expect(within(container.querySelector('.table-waiting') as HTMLElement).getByText('Dealer · Waiting')).toBeInTheDocument();

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

  // the dealer plays last: nobody is left waiting, and the seats below the stage run from the one
  // that played latest down to the first to play
  expect(container.querySelector('.table-waiting')).toBeNull();
  expect(seatsIn('.table-played')).toEqual(['ogion', 'chris']);

  // the dealer stands and the round ends: nobody has the stage, and each seat is brought into
  // focus in turn order as its result is told, Chris, then Ogion, then the dealer
  const order: string[] = [];
  const nextHand = () => screen.queryByRole('button', { name: 'Next hand' });
  for (let waited = 0; waited < 60_000 && !(order.length === 3 && nextHand() && !nextHand()?.hasAttribute('aria-disabled')); waited += 100) {
    act(() => vi.advanceTimersByTime(100));
    const key = container.querySelector('[data-focus]')?.closest<HTMLElement>('[data-seat-key]')?.dataset.seatKey;
    if (key && order.at(-1) !== key) order.push(key);
  }
  expect(order).toEqual(['chris', 'ogion', 'dealer']);
  expect(container.querySelector('.table-focus')).toBeNull();
  expect(seatsIn('.table-played')).toEqual(['dealer', 'ogion', 'chris']);
  expect(container.querySelector('[data-focus]')).toBeNull();
});

it('allows the human player to sit out between hands while computer players play a single hand, then rejoin', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  vi.spyOn(PlayingCardDeck.prototype, 'deal').mockImplementation(function (this: PlayingCardDeck, _count?: number, playerKeys?: string[]) {
    const keys = playerKeys ?? Object.keys(this.playerHands);
    if (keys.includes('chris')) this.playerHands.chris.cards = ['Spade_10', 'Diamond_7'];
    if (keys.includes('ogion')) this.playerHands.ogion.cards = ['Club_10', 'Heart_8'];
    if (keys.includes('dealer')) this.playerHands.dealer.cards = ['Club_9', 'Heart_8'];
  });
  const { container } = render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Players' }));
  const dialog = screen.getByRole('dialog', { name: 'Players' });
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /Ogion/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  // Chris stays on 17
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // Wait for round to finish and settle
  const sitOutBtn = () => screen.queryByRole('button', { name: 'Sit out' });
  for (let waited = 0; waited < 60_000 && !(sitOutBtn() && !sitOutBtn()?.hasAttribute('aria-disabled')); waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(sitOutBtn()).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next hand' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Change players' })).toBeInTheDocument();

  // Chris sits out
  fireEvent.click(screen.getByRole('button', { name: 'Sit out' }));

  // Chris is marked as sitting out
  expect(within(container.querySelector('[data-seat-key="chris"]') as HTMLElement).getByText('Sitting out')).toBeInTheDocument();

  // Ogion plays
  const rejoinBtn = () => screen.queryByRole('button', { name: 'Rejoin table' });
  for (let waited = 0; waited < 60_000 && !(rejoinBtn() && !rejoinBtn()?.hasAttribute('aria-disabled')); waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(rejoinBtn()).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sit out another hand' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Change players' })).toBeInTheDocument();

  // Ensure computer players do NOT play another hand by themselves
  act(() => vi.advanceTimersByTime(10000));
  expect(rejoinBtn()).toBeInTheDocument();

  // Chris rejoins the table
  fireEvent.click(screen.getByRole('button', { name: 'Rejoin table' }));

  // Now Chris is dealt cards again and has controls to Stay
  expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
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
