import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { dealCards, drawCards, emptyHand } from './functions/deck';
import { handValue } from './functions/getHandValue';
import { DeckState } from './types';
import App from './App';
import { CARD_FLIP_MS, CARD_REVEAL_PAUSE_MS } from './components/useCardFlip';
import { POT_BOUNCE_MS, POT_ENTER_MS, POT_LEAVE_MS } from './components/usePotMotion';
import { TOAST_EXIT_MS, TOAST_LIFE_MS } from './components/TableToasts';

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
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $25');
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-entering')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  expect(container.querySelector('.table-pot-badge.is-bouncing')).not.toBeInTheDocument();
  expect(screen.getByText('+$25 added to the pot').closest('[role=status]')).toHaveClass('table-toasts-pot');
  const wager = screen.getByRole('button', { name: 'Wager $25' });
  expect(wager).not.toHaveAttribute('aria-disabled');

  fireEvent.click(wager);
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $50');
  expect(container.querySelector('.table-dock .table-pot .table-pot-badge.is-bouncing')).toBeInTheDocument();
  expect(container.querySelector('.table-pot-shimmer')).toBeInTheDocument();

  // a click during the bounce does nothing
  fireEvent.click(screen.getByRole('button', { name: 'Wager $25' }));
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $50');

  // the pot never leaves the dock, and the wager toast shows immediately over the pot (with no turn toast over the table)
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  expect(screen.getByText('Chris wagered $25')).toBeInTheDocument();
  expect(screen.getByText('Pot: $50', { selector: '[role=status] *' })).toBeInTheDocument();
  expect(screen.getByText('Chris wagered $25').closest('[role=status]')).toHaveClass('table-toasts-pot');
  expect(screen.queryByText("Chris's turn")).not.toBeInTheDocument();
  expect(container.querySelectorAll('.table-pot')).toHaveLength(1);
  expect(container.querySelector('.table-dock .table-pot')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wager $25' })).not.toHaveAttribute('aria-disabled');

  // tapping the pot lists what each player has put in, over the pot, in place of the contribution toast
  const pot = screen.getByRole('button', { name: /Pot: \$50/ });
  expect(pot).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(pot);
  expect(pot).toHaveAttribute('aria-expanded', 'true');
  const breakdown = container.querySelector('.table-toasts-pot')!;
  expect(breakdown).toHaveTextContent('Chris: $50');
  expect(breakdown).not.toHaveTextContent('Chris wagered $25');

  // tapping it again puts the breakdown away
  fireEvent.click(pot);
  expect(pot).toHaveAttribute('aria-expanded', 'false');
  act(() => vi.advanceTimersByTime(TOAST_EXIT_MS));
  expect(breakdown).not.toHaveTextContent('Chris: $50');
  vi.useRealTimers();
});

it('keeps the pot after a hand ends, then slides it up and back in for the next hand', () => {
  allowMotion();
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_11', 'Diamond_14'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));

  // a natural blackjack ends the hand at once; the pot stays in the dock
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  expect(screen.getByText('✨ Blackjack')).toBeInTheDocument();
  expect(container.querySelector('.table-dock .table-pot')).toHaveTextContent('Pot: $25');

  // the next hand, once the results have been told: the last pot slides up out of view, showing its amount as it goes
  finishResults();
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
  // the mocked deal is a natural again, so the new hand's results are told before the buttons are free
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');
  finishResults();
  expect(screen.getByRole('button', { name: 'Next hand' })).not.toHaveAttribute('aria-disabled');
  vi.useRealTimers();
});

it('announces a round outcome as a table toast that leaves on its own', () => {
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  vi.useFakeTimers();
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // turn changes and stands are not announced; wait for the dealer's play to end the round
  expect(screen.queryByText("Faxe's turn")).not.toBeInTheDocument();
  for (let waited = 0; !screen.queryByText('Chris pushes') && waited < 10_000; waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }
  expect(screen.getByText('Chris pushes').closest('[role=status]')).toHaveClass('table-toasts-table');
  expect(screen.queryByText('Faxe stands')).not.toBeInTheDocument();

  // the line stays in the feed for its time, then fades and goes
  act(() => vi.advanceTimersByTime(TOAST_LIFE_MS + TOAST_EXIT_MS - 100));
  expect(screen.getByText('Chris pushes')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(200));
  expect(screen.queryByText('Chris pushes')).not.toBeInTheDocument();
});

it("turns the dealer's hole card over when the round ends, then empties the stage and tells each seat's result", () => {
  allowMotion();
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    // the dealer stays on 18, so Chris on 17 loses
    dealer: ['Club_10', 'Heart_8'],
  }));
  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

  // the dealer plays from the focused seat, hole card down, and stays on 18
  const holeCard = () => within(screen.getByRole('region', { name: "Faxe's hand" })).getAllByRole('button')[0];
  const dealerHole = holeCard();
  expect(dealerHole).toHaveClass('is-flippable', 'is-face-down');
  for (let waited = 0; holeCard().classList.contains('is-face-down') && waited < 30_000; waited += 100) {
    act(() => vi.advanceTimersByTime(100));
  }

  // the card turned over in place, in the dealer's seat, which keeps the stage while it does;
  // Next hand in the dock waits for it
  expect(holeCard()).toBe(dealerHole);
  expect(dealerHole).not.toHaveClass('is-face-down');
  expect(dealerHole).toHaveAccessibleName('Ten of Clubs');
  expect(container.querySelector('.table-focus')).toContainElement(dealerHole);
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');

  // the card has turned, but the dealer's hand stays on the stage for a pause before the table moves on
  act(() => vi.advanceTimersByTime(CARD_FLIP_MS));
  expect(container.querySelector('.table-focus')).toContainElement(dealerHole);
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');
  act(() => vi.advanceTimersByTime(CARD_REVEAL_PAUSE_MS - 1));
  expect(container.querySelector('.table-focus')).toContainElement(dealerHole);

  // then nobody has the stage: every seat is a chip in one column, the dealer first and Chris last
  act(() => vi.advanceTimersByTime(1));
  const seatsIn = (group: string) => Array.from(container.querySelectorAll<HTMLElement>(`${group} [data-seat-key]`)).map((slot) => slot.dataset.seatKey);
  expect(container.querySelector('.table-focus')).toBeNull();
  expect(container.querySelector('.table-layout')).toHaveClass('is-stageless');
  expect(container.querySelector('.table-waiting')).toBeNull();
  expect(seatsIn('.table-played')).toEqual(['dealer', 'chris']);
  expect(screen.getByRole('region', { name: "Chris's hand" }).closest('.table-played')).not.toBeNull();

  // each seat is brought into focus as its result is told, Chris first and the dealer last,
  // and Next hand waits until the last seat has had its turn
  const inFocus = () => container.querySelector('[data-focus]')?.closest<HTMLElement>('[data-seat-key]')?.dataset.seatKey;
  const waitFor = (done: () => boolean) => {
    for (let waited = 0; !done() && waited < 20_000; waited += 100) act(() => vi.advanceTimersByTime(100));
  };
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');
  waitFor(() => inFocus() === 'chris');
  expect(inFocus()).toBe('chris');
  expect(container.querySelector('[data-focus]')).toHaveAttribute('data-focus', 'danger');
  expect(screen.getByText('Chris loses')).toBeInTheDocument();
  waitFor(() => inFocus() === 'dealer');
  expect(inFocus()).toBe('dealer');
  expect(screen.getByText('Faxe wins!')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next hand' })).toHaveAttribute('aria-disabled', 'true');
  waitFor(() => !screen.getByRole('button', { name: 'Next hand' }).hasAttribute('aria-disabled'));
  expect(screen.getByRole('button', { name: 'Next hand' })).not.toHaveAttribute('aria-disabled');
  expect(container.querySelector('[data-focus]')).toBeNull();
  expect(container.querySelector('.table-focus')).toBeNull();
  vi.useRealTimers();
});

it("keeps the dealer above the stage while its hole card turns over after the human busts, then moves it below", () => {
  allowMotion();
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_10'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  const dealerHand = () => screen.getByRole('region', { name: "Faxe's hand" });
  const dealerHole = within(dealerHand()).getAllByRole('button')[0];
  expect(dealerHand().closest('.table-waiting')).not.toBeNull();

  // busting ends the round without the dealer playing, so the dealer never had the stage
  vi.mocked(drawCards).mockImplementation((deck) => ({ deck, drawn: ['Heart_5'] }));
  fireEvent.click(screen.getByRole('button', { name: 'Draw one card from the top of the deck (H)' }));
  expect(within(dealerHand()).getAllByRole('button')[0]).toBe(dealerHole);
  expect(dealerHole).not.toHaveClass('is-face-down');
  expect(dealerHand().closest('.table-waiting')).not.toBeNull();

  // the round is over, so nobody has the stage: Chris is a chip below the dealer, who still waits above
  const seatsIn = (group: string) => Array.from(container.querySelectorAll<HTMLElement>(`${group} [data-seat-key]`)).map((slot) => slot.dataset.seatKey);
  expect(container.querySelector('.table-focus')).toBeNull();
  expect(seatsIn('.table-waiting')).toEqual(['dealer']);
  expect(seatsIn('.table-played')).toEqual(['chris']);

  // the dealer stays up there through the pause after the card has turned, then joins Chris below
  act(() => vi.advanceTimersByTime(CARD_FLIP_MS + CARD_REVEAL_PAUSE_MS - 1));
  expect(dealerHand().closest('.table-waiting')).not.toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(dealerHand().closest('.table-played')).not.toBeNull();
  expect(container.querySelector('.table-waiting')).toBeNull();
  expect(seatsIn('.table-played')).toEqual(['dealer', 'chris']);
  vi.useRealTimers();
});

it("turns the dealer's hole card over where it waits when Show Dealer Hand is switched on, holding play until it has", async () => {
  allowMotion();
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  vi.useFakeTimers();
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  act(() => vi.advanceTimersByTime(POT_ENTER_MS));
  act(() => vi.advanceTimersByTime(POT_BOUNCE_MS));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const holeCard = () => within(screen.getByRole('region', { name: "Faxe's hand" })).getAllByRole('button')[0];
  const dealerHole = holeCard();
  expect(dealerHole.closest('.table-waiting')).not.toBeNull();
  expect(dealerHole).toHaveClass('is-face-down');
  expect(screen.getByRole('button', { name: 'Stay' })).not.toHaveAttribute('aria-disabled');

  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('switch', { name: 'Show Dealer Hand' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close options' }));

  // the same card turns over where it is: the dealer is not brought to the stage, and the controls wait
  expect(holeCard()).toBe(dealerHole);
  expect(dealerHole).not.toHaveClass('is-face-down');
  expect(dealerHole.closest('.table-waiting')).not.toBeNull();
  expect(container.querySelector('.table-focus')).toContainElement(screen.getByRole('region', { name: "Chris's hand" }));
  expect(screen.getByRole('button', { name: 'Stay' })).toHaveAttribute('aria-disabled', 'true');

  act(() => vi.advanceTimersByTime(CARD_FLIP_MS));
  expect(screen.getByRole('button', { name: 'Stay' })).not.toHaveAttribute('aria-disabled');
  vi.useRealTimers();
});

it("shows the dealer's hand as cards among the seats still to play during the human's turn", () => {
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal' }));

  const dealerHand = screen.getByRole('region', { name: "Faxe's hand" });
  const dealerCards = within(dealerHand).getAllByRole('button');
  expect(dealerCards).toHaveLength(2);
  // the hole card stays face down unless "Show Dealer Hand" is on
  expect(dealerCards[0]).toHaveClass('is-face-down', 'is-flippable');
  expect(dealerCards[0]).toHaveAccessibleName('Face-down card');
  expect(dealerCards[1]).not.toHaveClass('is-face-down');
  expect(dealerCards[1].querySelectorAll('.playing-card-corner')).toHaveLength(2);
  expect(dealerCards[1].querySelector('.playing-card-face.is-back')).toBeNull();
  // the dealer plays last, so it waits above the stage, and is tagged as the dealer
  expect(dealerHand.closest('.table-waiting')).not.toBeNull();
  expect(dealerHand.closest('.table-played')).toBeNull();
  expect(within(dealerHand.closest('.table-seat-slot') as HTMLElement).getByText('Dealer · Waiting')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: "Chris's hand" }).closest('.table-focus')).not.toBeNull();
});

it('forgets a pinned seat and an open pot breakdown when the game is reset and started again', async () => {
  // hands that leave the human a turn to take; a natural would end the round on the deal
  vi.mocked(dealCards).mockImplementation(rigDeal({
    chris: ['Spade_10', 'Diamond_7'],
    dealer: ['Club_10', 'Heart_7'],
  }));
  const { container } = render(<App />);
  const stageKey = () => container.querySelector('.table-focus')?.getAttribute('data-seat-key');
  const pot = () => screen.getByRole('button', { name: /Pot: \$/ });
  const startAndDeal = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deal' }));
  };

  startAndDeal();
  expect(stageKey()).toBe('chris');
  // bring the dealer forward and open the pot's breakdown, both during the human's turn in the first hand
  fireEvent.click(container.querySelector('.table-seat-slot[data-seat-key="dealer"] button')!);
  expect(stageKey()).toBe('dealer');
  fireEvent.click(pot());
  expect(pot()).toHaveAttribute('aria-expanded', 'true');

  // a new game reaches the same hand number, status and turn; neither choice may come back with it
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.click(screen.getByRole('button', { name: 'Clear application data stored locally in the browser' }));
  startAndDeal();
  expect(stageKey()).toBe('chris');
  expect(pot()).toHaveAttribute('aria-expanded', 'false');
  expect(container.querySelector('.table-toasts-pot')).not.toHaveTextContent('Chris: $');
});
