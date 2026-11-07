import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayingCard } from '../classes';
import { createGameState } from '../context';
import { GameAction } from '../enums';
import { gameReducer } from '../functions';
import { GameState } from '../types';
import { TOAST_EXIT_MS, TOAST_HOLD_MS, useTableToasts } from './TableToasts';

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
const draw = (state: GameState): GameState => gameReducer(state, { type: GameAction.Draw, playerKey: 'chris', deckSide: 'top', numberOfCards: 1 });
const stay = (state: GameState): GameState => gameReducer(state, { type: GameAction.Stay, playerKey: 'chris' });

const setup = (initial: GameState) => renderHook(
  ({ state }) => useTableToasts(state, false),
  { initialProps: { state: initial } },
);

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const titles = (toasts: { title: string }[]) => toasts.map((toast) => toast.title);
const descriptions = (entries: { description: string }[]) => entries.map((entry) => entry.description);

describe('toast timing', () => {
  it('shows a toast, fades it out, and removes it', () => {
    const { result, rerender } = setup(startedGame());
    expect(result.current.toasts).toEqual([]);

    rerender({ state: wager(startedGame()) });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({ title: '+$25 added to the pot', isLeaving: false });

    advance(TOAST_HOLD_MS - 1);
    expect(result.current.toasts[0].isLeaving).toBe(false);
    advance(1);
    expect(result.current.toasts[0].isLeaving).toBe(true);
    advance(TOAST_EXIT_MS - 1);
    expect(result.current.toasts).toHaveLength(1);
    advance(1);
    expect(result.current.toasts).toEqual([]);
  });

  it('stacks the next card on the last as it starts to fade, each with the same time on screen', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const second = wager(first);
    const third = wager(second);
    rerender({ state: second });
    rerender({ state: third });

    // the second waits for its turn rather than appearing beside the first
    expect(result.current.toasts).toHaveLength(1);
    advance(TOAST_HOLD_MS - 1);
    expect(result.current.toasts).toHaveLength(1);

    // it lands on top as the first starts to leave beneath it
    advance(1);
    expect(result.current.toasts.map((toast) => toast.isLeaving)).toEqual([true, false]);
    const [leaving, current] = result.current.toasts;
    expect(leaving.id).toBeLessThan(current.id);

    advance(TOAST_EXIT_MS);
    expect(result.current.toasts.map((toast) => toast.id)).toEqual([current.id]);

    // the second leaves one hold later, just as the first did
    advance(TOAST_HOLD_MS - TOAST_EXIT_MS - 1);
    expect(result.current.toasts[0].isLeaving).toBe(false);
    advance(1);
    expect(result.current.toasts[0].isLeaving).toBe(true);
    advance(TOAST_EXIT_MS);
    expect(result.current.toasts).toEqual([]);
  });

  it('gives every kind of toast the same time on screen', () => {
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
    for (let elapsed = 0; elapsed <= 4 * (TOAST_HOLD_MS + TOAST_EXIT_MS); elapsed += STEP_MS) {
      for (const toast of result.current.toasts) {
        if (!appeared.has(toast.title)) appeared.set(toast.title, elapsed);
      }
      for (const title of appeared.keys()) {
        if (!gone.has(title) && !titles(result.current.toasts).includes(title)) gone.set(title, elapsed);
      }
      advance(STEP_MS);
    }

    expect(Array.from(appeared.keys())).toEqual(['+$25 added to the pot', "Faxe's turn"]);
    for (const title of appeared.keys()) {
      expect(gone.get(title)! - appeared.get(title)!).toBe(TOAST_HOLD_MS + TOAST_EXIT_MS);
    }
    // one starts as the other starts to leave
    expect(appeared.get("Faxe's turn")! - appeared.get('+$25 added to the pot')!).toBe(TOAST_HOLD_MS);
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

    // the next has to wait for the first to have had its time
    rerender({ state: wager(second) });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.isBacklogged).toBe(true);

    advance(TOAST_HOLD_MS - 1);
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
    rerender({ state: draw(first) });

    expect(result.current.toasts).toEqual([]);
    expect(descriptions(result.current.activityLog).at(-1)).toMatch(/^drew 1 card/);
  });

  it('shows a change\'s entries the moment its toast has finished fading out', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    rerender({ state: wager(first) });

    expect(result.current.toasts).toHaveLength(1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');

    // through the hold and all but the last moment of the fade, the row stays out of the log
    advance(TOAST_HOLD_MS + TOAST_EXIT_MS - 1);
    expect(result.current.toasts).toHaveLength(1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');

    // the toast goes and the row arrives in the same update
    advance(1);
    expect(result.current.toasts).toEqual([]);
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

    advance(TOAST_HOLD_MS + TOAST_EXIT_MS);
    expect(wagers()).toHaveLength(1);

    // the second wager's row waits for the second toast, which arrived a hold after the first
    advance(TOAST_HOLD_MS - 1);
    expect(wagers()).toHaveLength(1);
    advance(1);
    expect(wagers()).toHaveLength(2);
    expect(result.current.toasts).toEqual([]);
  });

  it('keeps entries without a toast behind the toast still due, in order', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    const wagered = wager(first);
    rerender({ state: wagered });
    rerender({ state: draw(wagered) });

    // the draw has no toast of its own, and must not overtake the wager before it
    advance(TOAST_HOLD_MS + TOAST_EXIT_MS - 1);
    expect(descriptions(result.current.activityLog)).not.toContain('wagered $25');
    expect(descriptions(result.current.activityLog).some((description) => description.startsWith('drew'))).toBe(false);

    advance(1);
    expect(descriptions(result.current.activityLog).slice(-2)).toEqual(['wagered $25', expect.stringMatching(/^drew 1 card/)]);
  });

  it('shows the entry of a stay once the dealer\'s turn toast has gone', () => {
    const first = startedGame();
    const { result, rerender } = setup(first);
    // staying passes the turn to the dealer: one toast, whose entry is the stay
    rerender({ state: stay(first) });
    expect(titles(result.current.toasts)).toEqual(["Faxe's turn"]);
    expect(descriptions(result.current.activityLog)).not.toContain('stayed');

    advance(TOAST_HOLD_MS + TOAST_EXIT_MS);
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

    // the old toast finishing must not release entries that were recorded after the clear
    advance(TOAST_HOLD_MS + TOAST_EXIT_MS);
    expect(descriptions(result.current.activityLog)).not.toContain('Game started');

    // they follow their own toast
    advance(TOAST_HOLD_MS + TOAST_EXIT_MS);
    expect(result.current.toasts).toEqual([]);
    expect(descriptions(result.current.activityLog)).toContain('Game started');
  });
});
