import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../context';
import { GameAction } from '../enums';
import { gameReducer } from '../functions';
import { GameState, PlayerKey, VisibleToast } from '../types';
import { TableToastOptions, TableToasts, TOAST_EXIT_MS, TOAST_GAP_MS, TOAST_LIFE_MS, TOAST_MAX_LINES, TOAST_POT_MAX_LINES, TOAST_RESULT_MS, TOAST_REVEAL_MS, useTableToasts } from './TableToasts';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'time').mockImplementation(() => {});
  vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * A hand in progress with Chris to play against the dealer, antes paid and cards dealt:
 * Chris has 11, the dealer 17, and a 2 is next in the deck.
 */
const startedGame = (playerKeys: PlayerKey[] = ['chris', 'dealer']): GameState => {
  const started = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys });
  const anted = gameReducer(started, { type: GameAction.EvaluateGame });
  anted.deck = { ...anted.deck, cardKeys: ['Heart_2', 'Club_10', 'Diamond_7', 'Heart_6', 'Spade_5'] };
  return gameReducer(anted, { type: GameAction.Deal });
};

/**
 * A 4-seat hand where Chris, Ogion and Shevek each hold 16/18 against Dealer 17,
 * with 8s on top of the deck so Chris and Ogion bust on their first hit without ending the round.
 */
const fourSeatBustGame = (): GameState => {
  const started = gameReducer(createGameState(), {
    type: GameAction.NewGame,
    players: [
      { key: 'chris', title: 'Chris', isNPC: false, role: 'human', id: 1, bank: 1000 },
      { key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', id: 2, bank: 1000 },
      { key: 'shevek', title: 'Shevek', isNPC: true, role: 'bot', id: 3, bank: 1000 },
      { key: 'dealer', title: 'Faxe', isNPC: true, role: 'dealer', id: 4, bank: 1000 },
    ],
  });
  const anted = gameReducer(started, { type: GameAction.EvaluateGame });
  // Deal pops from the end of deck.cardKeys, 2 cards per seat in seatOrder: chris, ogion, shevek, dealer
  anted.deck = {
    ...anted.deck,
    cardKeys: [
      'Heart_8', 'Spade_8', // drawn on Chris's and Ogion's hits
      'Club_7', 'Diamond_10', // dealer: 17
      'Club_8', 'Diamond_10', // shevek: 18
      'Club_6', 'Diamond_10', // ogion: 16
      'Heart_6', 'Spade_10', // chris: 16
    ],
  };
  return gameReducer(anted, { type: GameAction.Deal });
};

const wager = (state: GameState, playerKey: PlayerKey = 'chris'): GameState =>
  gameReducer(state, { type: GameAction.Bet, playerKey, betAmount: 25 });
const hit = (state: GameState, playerKey: PlayerKey): GameState =>
  gameReducer(state, { type: GameAction.Draw, playerKey, deckSide: 'top', numberOfCards: 1 });
const stay = (state: GameState, playerKey: PlayerKey = 'chris'): GameState =>
  gameReducer(state, { type: GameAction.Stay, playerKey });
const shuffle = (state: GameState): GameState => gameReducer(state, { type: GameAction.Shuffle });

const setup = (initial: GameState, initialOptions?: TableToastOptions) => renderHook<
  ReturnType<typeof useTableToasts>,
  { state: GameState; options?: TableToastOptions }
>(
  ({ state, options }) => useTableToasts(state, false, 0, options),
  { initialProps: { state: initial, options: initialOptions } },
);

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const titles = (toasts: { title: string }[]) => toasts.map((toast) => toast.title);
const descriptions = (entries: { description: string }[]) => entries.map((entry) => entry.description);

describe('who a toast is about', () => {
  const wagerToast = (playerKey: string, playerName: string) => ({
    id: 1,
    title: `${playerName} wagered $25`,
    subtitle: 'Pot: $75',
    tone: 'brand' as const,
    category: 'pot' as const,
    kind: 'pot-contribution' as const,
    playerKey,
    playerName,
    isLeaving: false,
  });

  it("shows a player's initials beside their name when they have no portrait", () => {
    const { container } = render(<TableToasts toasts={[wagerToast('chris', 'Chris')]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chris wagered $25');
    expect(container.querySelector('.fui-Avatar')).toHaveTextContent('C');
    expect(container.querySelector('img')).toBeNull();
  });

  it("shows a character's portrait beside their name", () => {
    const { container } = render(<TableToasts toasts={[wagerToast('dealer', 'Faxe')]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Faxe wagered $25');
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('.fui-Avatar')).toBeNull();
  });

  it('shows no picture on a toast that is not about a seat', () => {
    const { container } = render(<TableToasts toasts={[{ id: 1, title: '+$50 added to the pot', subtitle: 'Pot: $50', tone: 'brand', category: 'pot', kind: 'pot-contribution', isLeaving: false }]} />);
    expect(container.querySelector('img, .fui-Avatar')).toBeNull();
  });
});

describe('the feed', () => {
  const line = (id: number, title: string, overrides: Partial<VisibleToast> = {}): VisibleToast => ({
    id,
    title,
    tone: 'brand',
    category: 'gameplay',
    isLeaving: false,
    ...overrides,
  });

  it('announces visible table toasts through a polite status region', () => {
    render(<TableToasts toasts={[line(1, 'Chris busts!', { subtitle: 'Total 24', tone: 'danger' })]} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Chris busts!');
    expect(status).toHaveTextContent('Total 24');
  });

  it('holds several lines at once, oldest first, each with its title and detail', () => {
    render(<TableToasts toasts={[
      line(1, 'Chris busts!', { subtitle: 'Total 24', tone: 'danger' }),
      line(2, 'Chris loses', { subtitle: 'Busted', tone: 'danger' }),
      line(3, 'Faxe wins!', { tone: 'success' }),
    ]} />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Chris busts!Total 24Chris losesBustedFaxe wins!');
    expect(status.children).toHaveLength(3);
  });

  it('sits over the pot when placed there, the pot amount left for assistive technology', () => {
    render(<TableToasts placement="pot" toasts={[line(1, 'Chris wagered $25', { subtitle: 'Pot: $50', category: 'pot', kind: 'pot-contribution' })]} />);

    const status = screen.getByRole('status');
    expect(status).toHaveClass('table-toasts-pot');
    expect(status).toHaveTextContent('Chris wagered $25Pot: $50');
  });

  it('keeps a line that is leaving in the feed until it has gone', () => {
    render(<TableToasts toasts={[line(1, 'Chris busts!', { isLeaving: true }), line(2, 'Faxe wins!')]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Chris busts!Faxe wins!');
  });
});

describe('toast timing', () => {
  it('shows a toast, then fades it out and removes it once its time is up', () => {
    const { result, rerender } = setup(startedGame());
    expect(result.current.toasts).toEqual([]);

    rerender({ state: wager(startedGame()) });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({ title: 'Chris wagered $25', playerKey: 'chris', playerName: 'Chris', isLeaving: false });

    advance(TOAST_LIFE_MS - 1);
    expect(result.current.toasts[0].isLeaving).toBe(false);
    advance(1);
    expect(result.current.toasts[0].isLeaving).toBe(true);
    advance(TOAST_EXIT_MS - 1);
    expect(result.current.toasts).toHaveLength(1);
    advance(1);
    expect(result.current.toasts).toEqual([]);
  });

  it('shows the next gameplay toast a gap after the last, beside it rather than in its place', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const second = hit(first, 'chris');
    const third = hit(second, 'ogion');
    rerender({ state: second });
    rerender({ state: third });

    // the second waits for its turn rather than appearing with the first
    expect(titles(result.current.toasts)).toEqual(['Chris busts!']);
    advance(TOAST_GAP_MS - 1);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!']);

    // then it joins the first, which stays where it is
    advance(1);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Ogion busts!']);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([false, false]);
    const [older, newer] = result.current.toasts;
    expect(older.id).toBeLessThan(newer.id);

    // each leaves after the same time on screen, the second a gap after the first
    advance(TOAST_LIFE_MS - TOAST_GAP_MS);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([true, false]);
    advance(TOAST_EXIT_MS);
    expect(result.current.toasts.map((toast) => toast.id)).toEqual([newer.id]);
    advance(TOAST_GAP_MS - TOAST_EXIT_MS);
    expect(result.current.toasts[0].isLeaving).toBe(true);
    advance(TOAST_EXIT_MS);
    expect(result.current.toasts).toEqual([]);
  });

  it('makes the oldest line leave when more are showing than the feed holds', () => {
    // Two mid-round busts plus two results = four table notices
    const first = fourSeatBustGame();
    const { result, rerender } = renderHook(({ state }) => useTableToasts(state, true), { initialProps: { state: first } });
    const chrisBust = hit(first, 'chris');
    const ogionBust = hit(chrisBust, 'ogion');
    const shevekStay = stay(ogionBust, 'shevek');
    const dealerStay = stay(shevekStay, 'dealer');
    rerender({ state: chrisBust });
    rerender({ state: ogionBust });
    rerender({ state: dealerStay });

    // the feed fills up, a gap apart, with nothing leaving yet
    advance((TOAST_MAX_LINES - 1) * TOAST_GAP_MS);
    expect(result.current.toasts).toHaveLength(TOAST_MAX_LINES);
    expect(result.current.toasts.some((toast) => toast.isLeaving)).toBe(false);
    const [oldest, ...rest] = result.current.toasts;

    // one more arrives, and the oldest makes way for it at once, long before its own time is up
    advance(TOAST_RESULT_MS);
    expect(result.current.toasts).toHaveLength(TOAST_MAX_LINES + 1);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([true, false, false, false]);
    advance(TOAST_EXIT_MS);
    expect(result.current.toasts.map((toast) => toast.id)).not.toContain(oldest.id);
    expect(result.current.toasts.slice(0, TOAST_MAX_LINES - 1).map((toast) => toast.id)).toEqual(rest.map((toast) => toast.id));
  });

  it('gives pot toasts their own immediate timing apart from gameplay toasts', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const chrisBust = hit(first, 'chris');
    rerender({ state: chrisBust });
    const ogionBust = hit(chrisBust, 'ogion');
    rerender({ state: ogionBust });
    // Even while Ogion's bust is waiting in the gameplay queue, a pot contribution appears at once
    const shevekWager = wager(ogionBust, 'shevek');
    rerender({ state: shevekWager });

    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Shevek wagered $25']);
    expect(result.current.toasts.some((toast) => toast.isLeaving)).toBe(false);

    // Another pot contribution immediately takes the previous one's place over the pot
    rerender({ state: wager(shevekWager, 'shevek') });
    expect(result.current.toasts.filter((toast) => toast.kind === 'pot-contribution' && !toast.isLeaving)).toHaveLength(TOAST_POT_MAX_LINES);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([false, true, false]);
    advance(TOAST_EXIT_MS);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Shevek wagered $25']);

    // And the queued gameplay toast still arrives on its own schedule
    advance(TOAST_GAP_MS - TOAST_EXIT_MS);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Shevek wagered $25', 'Ogion busts!']);
  });

  it('does not delay a gameplay toast after a pot toast', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const wagered = wager(first, 'chris');
    rerender({ state: wagered });
    expect(titles(result.current.toasts)).toEqual(['Chris wagered $25']);

    // A gameplay toast arriving right after a pot toast shows straight away
    rerender({ state: hit(wagered, 'chris') });
    expect(titles(result.current.toasts)).toEqual(['Chris wagered $25', 'Chris busts!']);
  });

  it('gives every kind of toast the same time on screen when nothing pushes it out', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const second = hit(first, 'chris');
    const third = hit(second, 'ogion');
    rerender({ state: second });
    rerender({ state: third });

    // note when each toast shows and goes; the schedule is in whole steps of 50ms
    const STEP_MS = 50;
    const appeared = new Map<string, number>();
    const gone = new Map<string, number>();
    for (let elapsed = 0; elapsed <= 2 * (TOAST_LIFE_MS + TOAST_EXIT_MS); elapsed += STEP_MS) {
      for (const toast of result.current.toasts) {
        if (!appeared.has(toast.title)) appeared.set(toast.title, elapsed);
      }
      for (const title of appeared.keys()) {
        if (!gone.has(title) && !titles(result.current.toasts).includes(title)) gone.set(title, elapsed);
      }
      advance(STEP_MS);
    }

    expect(Array.from(appeared.keys())).toEqual(['Chris busts!', 'Ogion busts!']);
    for (const title of appeared.keys()) {
      expect(gone.get(title)! - appeared.get(title)!).toBe(TOAST_LIFE_MS + TOAST_EXIT_MS);
    }
    // the second arrives a gap after the first
    expect(appeared.get('Ogion busts!')! - appeared.get('Chris busts!')!).toBe(TOAST_GAP_MS);
  });
});

describe('results at the end of a round', () => {
  // Chris stays on 11 and the dealer stays on 17: Chris loses and the dealer wins
  const dealerStays = (state: GameState): GameState => gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
  const setupResults = (initial: GameState) => renderHook(
    ({ state, hold }: { state: GameState; hold: number }) => useTableToasts(state, true, hold),
    { initialProps: { state: initial, hold: 0 } },
  );

  it("tells the human and dealer results in turn, each seat in focus while its toast is the newest", () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    expect(result.current.isAnnouncingResults).toBe(false);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });

    // Chris's result arrives at once (no stand toast ahead of it), and Chris is in focus
    expect(titles(result.current.toasts)).toEqual(['Chris loses']);
    expect(result.current.isAnnouncingResults).toBe(true);
    expect(result.current.focus).toMatchObject({ key: 'chris', tone: 'danger' });

    // the dealer's follows TOAST_RESULT_MS later, and takes the focus with it
    advance(TOAST_RESULT_MS - 1);
    expect(result.current.focus).toMatchObject({ key: 'chris' });
    advance(1);
    expect(titles(result.current.toasts)).toEqual(['Chris loses', 'Faxe wins!']);
    expect(result.current.focus).toMatchObject({ key: 'dealer', tone: 'success' });
    expect(result.current.isAnnouncingResults).toBe(true);

    // once the last seat has had its turn nothing is in focus and the announcing is over
    advance(TOAST_RESULT_MS);
    expect(result.current.focus).toBeUndefined();
    expect(result.current.isAnnouncingResults).toBe(false);
  });

  it('holds the results back while the dealer\'s hole card is still turning over', () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    const hold = 1500;
    rerender({ state: dealerStays(dealersTurn), hold });

    // the first result waits out the hold; announcing starts at once
    expect(result.current.isAnnouncingResults).toBe(true);
    advance(hold - 1);
    expect(result.current.focus).toBeUndefined();
    expect(titles(result.current.toasts)).toEqual([]);
    advance(1);
    expect(result.current.focus).toMatchObject({ key: 'chris' });
    expect(titles(result.current.toasts)).toEqual(['Chris loses']);
  });

  it('does not hold results that no card turn precedes', () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });
    expect(result.current.focus).toMatchObject({ key: 'chris' });
  });

  it('reports the activity log entries only after the last result has been on screen a while', () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });
    advance(TOAST_RESULT_MS);
    expect(titles(result.current.toasts).at(-1)).toBe('Faxe wins!');

    // the dealer's stay is the round's entry; it follows the last toast of the round
    const stays = () => descriptions(result.current.activityLog).filter((description) => description === 'stayed');
    expect(stays()).toHaveLength(1);
    advance(TOAST_REVEAL_MS - 1);
    expect(stays()).toHaveLength(1);
    advance(1);
    expect(stays()).toHaveLength(2);
  });
});

describe('backlog', () => {
  it('reports only a gameplay toast waiting for its turn, so computer play holds off', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    expect(result.current.isBacklogged).toBe(false);

    // the first gameplay toast shows at once; nothing is waiting
    const second = hit(first, 'chris');
    rerender({ state: second });
    expect(result.current.isBacklogged).toBe(false);

    // the next gameplay toast has to wait a gap after the first
    const third = hit(second, 'ogion');
    rerender({ state: third });
    expect(titles(result.current.toasts)).toEqual(['Chris busts!']);
    expect(result.current.isBacklogged).toBe(true);

    advance(TOAST_GAP_MS - 1);
    expect(result.current.isBacklogged).toBe(true);
    advance(1);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Ogion busts!']);
    expect(result.current.isBacklogged).toBe(false);
  });

  it('never marks pot-category toasts as backlogged', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);

    // Rapid pot contributions appear immediately without backlogging
    const w1 = wager(first, 'chris');
    rerender({ state: w1 });
    expect(result.current.isBacklogged).toBe(false);
    const w2 = wager(w1, 'chris');
    rerender({ state: w2 });
    expect(result.current.isBacklogged).toBe(false);

    // Even a pot-category notice queued behind a gameplay toast in the center feed (sitting out) does not pause computer play
    const chrisBust = hit(w2, 'chris');
    rerender({ state: chrisBust });
    const round2Ready = gameReducer(chrisBust, { type: GameAction.SitOut, playerKey: 'chris', isSittingOut: true });
    const nextRound = gameReducer(round2Ready, { type: GameAction.Deal });
    rerender({ state: nextRound });
    expect(result.current.isBacklogged).toBe(false);
  });
});

describe('activity log pacing', () => {
  it('starts with the log it was given and announces nothing for it', () => {
    const game = startedGame();
    const { result } = setup(game);
    expect(descriptions(result.current.activityLog)).toEqual(descriptions(game.activityLog));
    expect(result.current.toasts).toEqual([]);
  });

  it('shows entries that have no toast at once when nothing is on screen', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: shuffle(first) });

    expect(result.current.toasts).toEqual([]);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('Deck shuffled');
  });

  it("shows a change's entries once its toast has been on screen for a moment", () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: wager(first) });

    expect(result.current.toasts).toHaveLength(1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');

    // the row stays out of the log until the toast has had its moment
    advance(TOAST_REVEAL_MS - 1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');

    // the row arrives while the toast is still in the feed
    advance(1);
    expect(result.current.toasts).toHaveLength(1);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('wagered $25');
  });

  it('holds back the entries of gameplay toasts that are still waiting, one toast at a time', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const second = hit(first, 'chris');
    const third = hit(second, 'ogion');
    rerender({ state: second });
    rerender({ state: third });
    const draws = () => descriptions(result.current.activityLog).filter((description) => description.startsWith('drew 1 card'));

    advance(TOAST_REVEAL_MS);
    expect(draws()).toHaveLength(1);

    // Ogion's draw waits for Ogion's bust toast, which arrived a gap after Chris's
    advance(TOAST_GAP_MS - 1);
    expect(draws()).toHaveLength(1);
    advance(1);
    expect(draws()).toHaveLength(2);
  });

  it('keeps entries without a toast behind the toast still due, in order', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const wagered = wager(first);
    rerender({ state: wagered });
    rerender({ state: shuffle(wagered) });

    // the shuffle has no toast of its own, and must not overtake the wager before it
    advance(TOAST_REVEAL_MS - 1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');
    expect(descriptions(result.current.activityLog)).not.toContain('Deck shuffled');

    advance(1);
    expect(descriptions(result.current.activityLog).slice(-2)).toEqual(['wagered $25', 'Deck shuffled']);
  });

  it('keeps immediate pot entries behind an earlier queued gameplay toast so the log stays in order', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first);
    const chrisBust = hit(first, 'chris');
    const ogionBust = hit(chrisBust, 'ogion');
    const shevekWager = gameReducer(ogionBust, { type: GameAction.Bet, playerKey: 'shevek', betAmount: 50 });
    rerender({ state: chrisBust });
    rerender({ state: ogionBust });
    rerender({ state: shevekWager });

    // Pot toast shows at once, while Ogion's bust is still waiting TOAST_GAP_MS
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Shevek wagered $50']);

    // At TOAST_REVEAL_MS, the pot entry must still wait for Ogion's queued bust toast
    advance(TOAST_REVEAL_MS);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $50');

    // Once Ogion's toast has also had TOAST_REVEAL_MS, both entries appear in order
    advance(TOAST_GAP_MS - 1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $50');
    advance(1);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('wagered $50');
  });

  it('shows the entry of a mid-round stay at once since stays have no toast', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: stay(first) });
    expect(result.current.toasts).toEqual([]);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('stayed');
  });

  it('starts over when the log is cleared, and never reveals the new log early', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: wager(first) });
    expect(result.current.toasts).toHaveLength(1);

    // Advance partway into the wager toast's moment before resetting the game
    advance(500);
    const cleared = gameReducer(first, { type: GameAction.ResetGame, clearActivityLog: true });
    rerender({ state: cleared });
    expect(result.current.activityLog).toEqual([]);

    const restarted = gameReducer(cleared, { type: GameAction.NewGame, playerKeys: ['chris', 'dealer'] });
    const withAnte = gameReducer(restarted, { type: GameAction.EvaluateGame });
    rerender({ state: withAnte });
    expect(titles(result.current.toasts)).toContain('+$25 added to the pot');

    // the old toast's moment ending must not release entries recorded after the clear
    advance(TOAST_REVEAL_MS - 500);
    expect(descriptions(result.current.activityLog)).not.toContain('anted $25');

    // they follow their own toast
    advance(500);
    expect(descriptions(result.current.activityLog)).toContain('anted $25');
  });
});

describe('notification toggles', () => {
  const dealerStays = (state: GameState): GameState => gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });

  it('suppresses gameplay toasts and reveals their log entries immediately when gameplay notifications are off', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first, { isGameplayToastsEnabled: false, isPotToastsEnabled: true });

    // A mid-round bust produces no toast, no backlog, and reveals its log entry at once
    const busted = hit(first, 'chris');
    rerender({ state: busted, options: { isGameplayToastsEnabled: false, isPotToastsEnabled: true } });
    expect(result.current.toasts).toEqual([]);
    expect(result.current.isBacklogged).toBe(false);
    expect(descriptions(result.current.activityLog).at(-1)).toContain('drew 1 card');

    // Pot toasts still appear
    const wagered = wager(busted, 'ogion');
    rerender({ state: wagered, options: { isGameplayToastsEnabled: false, isPotToastsEnabled: true } });
    expect(titles(result.current.toasts)).toEqual(['Ogion wagered $25']);

    // Results do not announce or take focus when gameplay notifications are off, and their entries reveal once the pot toast finishes
    advance(TOAST_REVEAL_MS);
    const roundDone = dealerStays(stay(stay(wagered, 'ogion'), 'shevek'));
    rerender({ state: roundDone, options: { isGameplayToastsEnabled: false, isPotToastsEnabled: true } });
    expect(result.current.isAnnouncingResults).toBe(false);
    expect(result.current.focus).toBeUndefined();
    expect(result.current.toasts.filter((toast) => toast.category === 'gameplay')).toEqual([]);
    expect(descriptions(result.current.activityLog)).toContain('stayed');
  });

  it('suppresses pot toasts and reveals their log entries immediately when pot notifications are off', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first, { isGameplayToastsEnabled: true, isPotToastsEnabled: false });

    const wagered = wager(first, 'chris');
    rerender({ state: wagered, options: { isGameplayToastsEnabled: true, isPotToastsEnabled: false } });
    expect(result.current.toasts).toEqual([]);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('wagered $25');

    // Gameplay toasts still appear normally
    const busted = hit(wagered, 'chris');
    rerender({ state: busted, options: { isGameplayToastsEnabled: true, isPotToastsEnabled: false } });
    expect(titles(result.current.toasts)).toEqual(['Chris busts!']);
  });

  it('lets already-queued toasts finish normally when a toggle changes mid-game', () => {
    const first = fourSeatBustGame();
    const { result, rerender } = setup(first, { isGameplayToastsEnabled: true, isPotToastsEnabled: true });

    const chrisBust = hit(first, 'chris');
    const ogionBust = hit(chrisBust, 'ogion');
    rerender({ state: chrisBust, options: { isGameplayToastsEnabled: true, isPotToastsEnabled: true } });
    rerender({ state: ogionBust, options: { isGameplayToastsEnabled: true, isPotToastsEnabled: true } });
    expect(titles(result.current.toasts)).toEqual(['Chris busts!']);
    expect(result.current.isBacklogged).toBe(true);

    // Flipping gameplay notifications off does not recompute or cancel the already-queued Ogion toast
    const stayed = stay(ogionBust, 'shevek');
    rerender({ state: stayed, options: { isGameplayToastsEnabled: false, isPotToastsEnabled: true } });
    advance(TOAST_GAP_MS);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Ogion busts!']);
    expect(result.current.isBacklogged).toBe(false);

    // Subsequent gameplay events (like round results) are dropped
    rerender({ state: dealerStays(stayed), options: { isGameplayToastsEnabled: false, isPotToastsEnabled: true } });
    expect(result.current.isAnnouncingResults).toBe(false);
    expect(titles(result.current.toasts)).toEqual(['Chris busts!', 'Ogion busts!']);
  });
});
