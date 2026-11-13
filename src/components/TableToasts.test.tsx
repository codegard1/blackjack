import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayingCard } from '../classes';
import { createGameState } from '../context';
import { GameAction } from '../enums';
import { gameReducer } from '../functions';
import { GameState, VisibleToast } from '../types';
import { TableToasts, TOAST_EXIT_MS, TOAST_GAP_MS, TOAST_LIFE_MS, TOAST_MAX_LINES, TOAST_POT_MAX_LINES, TOAST_RESULT_MS, TOAST_REVEAL_MS, useTableToasts } from './TableToasts';

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
 * Chris has 11, the dealer 17, and a 2 is next in the deck. The state a hook starts from.
 */
const startedGame = (): GameState => {
  const started = gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });
  const anted = gameReducer(started, { type: GameAction.EvaluateGame, gameStatus: started.gameStatus });
  anted.deck.cards = ['Heart_2', 'Club_10', 'Diamond_7', 'Heart_6', 'Spade_5'].map((key) => new PlayingCard(key));
  return gameReducer(anted, { type: GameAction.Deal });
};

const wager = (state: GameState): GameState => gameReducer(state, { type: GameAction.Bet, playerKey: 'chris', betAmount: 25 });
const stay = (state: GameState): GameState => gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });
const shuffle = (state: GameState): GameState => gameReducer(state, { type: GameAction.Shuffle });

const setup = (initial: GameState) => renderHook(
  ({ state }) => useTableToasts(state, false),
  { initialProps: { state: initial } },
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
    const { container } = render(<TableToasts toasts={[{ id: 1, title: '+$50 added to the pot', subtitle: 'Pot: $50', tone: 'brand', kind: 'pot-contribution', isLeaving: false }]} />);
    expect(container.querySelector('img, .fui-Avatar')).toBeNull();
  });
});

describe('the feed', () => {
  const line = (id: number, title: string, overrides: Partial<VisibleToast> = {}): VisibleToast => ({ id, title, tone: 'brand', isLeaving: false, ...overrides });

  it('announces visible table toasts through a polite status region', () => {
    render(<TableToasts toasts={[line(1, 'Chris hits', { subtitle: 'Queen of Hearts. Total 20' })]} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Chris hits');
    expect(status).toHaveTextContent('Queen of Hearts. Total 20');
  });

  it('holds several lines at once, oldest first, each with its title and detail', () => {
    render(<TableToasts toasts={[
      line(1, 'Chris wagered $25', { subtitle: 'Pot: $50' }),
      line(2, "Faxe's turn"),
      line(3, 'Faxe hits', { subtitle: 'Drew Four of Hearts. Total 14' }),
    ]} />);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe("Chris wagered $25Pot: $50Faxe's turnFaxe hitsDrew Four of Hearts. Total 14");
    expect(status.children).toHaveLength(3);
  });

  it('sits over the pot when placed there, the pot amount left for assistive technology', () => {
    render(<TableToasts placement="pot" toasts={[line(1, 'Chris wagered $25', { subtitle: 'Pot: $50', kind: 'pot-contribution' })]} />);

    const status = screen.getByRole('status');
    expect(status).toHaveClass('table-toasts-pot');
    expect(status).toHaveTextContent('Chris wagered $25Pot: $50');
  });

  it('keeps a line that is leaving in the feed until it has gone', () => {
    render(<TableToasts toasts={[line(1, 'Chris wagered $25', { isLeaving: true }), line(2, "Faxe's turn")]} />);
    expect(screen.getByRole('status')).toHaveTextContent("Chris wagered $25Faxe's turn");
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

  it('shows the next toast a gap after the last, beside it rather than in its place', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const second = wager(first);
    rerender({ state: second });
    rerender({ state: stay(second) });

    // the second waits for its turn rather than appearing with the first
    expect(result.current.toasts).toHaveLength(1);
    advance(TOAST_GAP_MS - 1);
    expect(result.current.toasts).toHaveLength(1);

    // then it joins the first, which stays where it is
    advance(1);
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
    // Chris stays and the dealer stays: the dealer's turn, its stand and the two results, four of the table's notices
    const first = startedGame();
    const { result, rerender } = renderHook(({ state }) => useTableToasts(state, true), { initialProps: { state: first } });
    const dealersTurn = stay(first);
    rerender({ state: dealersTurn });
    rerender({ state: gameReducer(dealersTurn, { type: GameAction.Stay, playerKey: 'dealer' }) });

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

  it("counts the pot's notices apart from the table's: a new contribution takes the place of the last", () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const second = wager(first);
    rerender({ state: second });
    const third = stay(second);
    rerender({ state: third });
    rerender({ state: wager(third) });

    // the wager and the dealer's turn are in different feeds, so neither pushes the other out
    advance(TOAST_GAP_MS);
    expect(titles(result.current.toasts)).toEqual(['Chris wagered $25', "Faxe's turn"]);
    expect(result.current.toasts.some((toast) => toast.isLeaving)).toBe(false);

    // the next wager takes the first one's place over the pot; the table's notice stays
    advance(TOAST_GAP_MS);
    expect(result.current.toasts.filter((toast) => toast.kind === 'pot-contribution' && !toast.isLeaving)).toHaveLength(TOAST_POT_MAX_LINES);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([true, false, false]);
    advance(TOAST_EXIT_MS);
    expect(titles(result.current.toasts)).toEqual(["Faxe's turn", 'Chris wagered $25']);
  });

  it('gives every kind of toast the same time on screen when nothing pushes it out', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    // a pot contribution, then the dealer's turn
    const second = wager(first);
    const third = stay(second);
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

    expect(Array.from(appeared.keys())).toEqual(['Chris wagered $25', "Faxe's turn"]);
    for (const title of appeared.keys()) {
      expect(gone.get(title)! - appeared.get(title)!).toBe(TOAST_LIFE_MS + TOAST_EXIT_MS);
    }
    // the second arrives a gap after the first
    expect(appeared.get("Faxe's turn")! - appeared.get('Chris wagered $25')!).toBe(TOAST_GAP_MS);
  });
});

describe('results at the end of a round', () => {
  // Chris stays on 11 and the dealer stays on 17: Chris loses and the dealer wins
  const dealerStays = (state: GameState): GameState => gameReducer(state, { type: GameAction.Stay, playerKey: 'dealer' });
  const setupResults = (initial: GameState) => renderHook(
    ({ state, hold }: { state: GameState; hold: number }) => useTableToasts(state, true, hold),
    { initialProps: { state: initial, hold: 0 } },
  );

  it("tells each seat's result in turn, the seat in focus while its toast is the newest", () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    expect(result.current.isAnnouncingResults).toBe(false);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });

    // the dealer's stand is told first, as any notice; the results are queued behind it
    expect(titles(result.current.toasts)).toEqual(['Faxe stands']);
    expect(result.current.isAnnouncingResults).toBe(true);
    expect(result.current.focus).toBeUndefined();

    // Chris's result arrives a gap later, and Chris is in focus for as long as it is the newest
    advance(TOAST_GAP_MS - 1);
    expect(result.current.focus).toBeUndefined();
    advance(1);
    expect(titles(result.current.toasts)).toEqual(['Faxe stands', 'Chris loses']);
    expect(result.current.focus).toMatchObject({ key: 'chris', tone: 'danger' });

    // the dealer's follows, and takes the focus with it
    advance(TOAST_RESULT_MS - 1);
    expect(result.current.focus).toMatchObject({ key: 'chris' });
    advance(1);
    expect(titles(result.current.toasts)).toEqual(['Faxe stands', 'Chris loses', 'Faxe wins!']);
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

    // the first result waits out the hold, longer than the usual gap; announcing starts at once
    expect(result.current.isAnnouncingResults).toBe(true);
    advance(hold - 1);
    expect(result.current.focus).toBeUndefined();
    expect(titles(result.current.toasts)).toEqual(['Faxe stands']);
    advance(1);
    expect(result.current.focus).toMatchObject({ key: 'chris' });
    expect(titles(result.current.toasts)).toEqual(['Faxe stands', 'Chris loses']);
  });

  it('does not hold results that no card turn precedes', () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });
    advance(TOAST_GAP_MS);
    expect(result.current.focus).toMatchObject({ key: 'chris' });
  });

  it('reports the activity log entries only after the last result has been on screen a while', () => {
    const dealersTurn = stay(startedGame());
    const { result, rerender } = setupResults(dealersTurn);
    rerender({ state: dealerStays(dealersTurn), hold: 0 });
    advance(TOAST_GAP_MS + TOAST_RESULT_MS);
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
  it('reports a toast that is waiting for its turn, so computer play can hold off', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    expect(result.current.isBacklogged).toBe(false);

    // the first toast shows at once; nothing is waiting
    const second = wager(first);
    rerender({ state: second });
    expect(result.current.isBacklogged).toBe(false);

    // the next has to wait a gap after the first
    rerender({ state: wager(second) });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.isBacklogged).toBe(true);

    advance(TOAST_GAP_MS - 1);
    expect(result.current.isBacklogged).toBe(true);
    advance(1);
    expect(result.current.toasts).toHaveLength(2);
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

  it('holds back the entries of toasts that are still waiting, one toast at a time', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const second = wager(first);
    const third = wager(second);
    rerender({ state: second });
    rerender({ state: third });
    const wagers = () => descriptions(result.current.activityLog).filter((description) => description === 'wagered $25');

    advance(TOAST_REVEAL_MS);
    expect(wagers()).toHaveLength(1);

    // the second wager's row waits for the second toast, which arrived a gap after the first
    advance(TOAST_GAP_MS - 1);
    expect(wagers()).toHaveLength(1);
    advance(1);
    expect(wagers()).toHaveLength(2);
    // over the pot the second wager's toast has taken the first one's place
    expect(result.current.toasts).toHaveLength(1);
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

  it("shows the entry of a stay once the dealer's turn toast has had its moment", () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    // staying passes the turn to the dealer: one toast, whose entry is the stay
    rerender({ state: stay(first) });
    expect(titles(result.current.toasts)).toEqual(["Faxe's turn"]);
    expect(descriptions(result.current.activityLog)).not.toContain('stayed');

    advance(TOAST_REVEAL_MS);
    expect(descriptions(result.current.activityLog).at(-1)).toBe('stayed');
  });

  it('starts over when the log is cleared, and never reveals the new log early', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: wager(first) });
    expect(result.current.toasts).toHaveLength(1);

    // clear the log and start again while the wager's toast is still on screen
    const cleared = gameReducer(first, { type: GameAction.ResetGame, clearActivityLog: true });
    rerender({ state: cleared });
    expect(result.current.activityLog).toEqual([]);
    rerender({ state: gameReducer(cleared, { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] }) });

    // the old toast's moment ending must not release entries that were recorded after the clear
    advance(TOAST_REVEAL_MS);
    expect(descriptions(result.current.activityLog)).not.toContain('Game started');

    // they follow their own toast
    advance(TOAST_REVEAL_MS);
    expect(descriptions(result.current.activityLog)).toContain('Game started');
  });
});
