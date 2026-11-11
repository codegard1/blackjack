import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayingCardKey } from '../types';
import { CARD_FLIP_MS, useCardFlip } from './useCardFlip';

type Args = { cardKey?: PlayingCardKey; isHidden: boolean; isInFocus: boolean };

const renderFlip = (initial: Args) => renderHook((args: Args) => useCardFlip(args.cardKey, args.isHidden, args.isInFocus), { initialProps: initial });

/** the test setup reports reduced motion; these tests need motion unless they say otherwise */
const allowMotion = (isReduced = false) => {
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ ...matchMedia(query), matches: isReduced }));
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useCardFlip', () => {
  it('is idle on the first render, even when the card is already face up', () => {
    allowMotion();
    const { result } = renderFlip({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    expect(result.current).toEqual({ isBusy: false, holdsFocus: false });
  });

  it('is busy for the flip when the card turns face up, then idle', () => {
    allowMotion();
    const { result, rerender } = renderFlip({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    rerender({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    expect(result.current.isBusy).toBe(true);

    act(() => { vi.advanceTimersByTime(CARD_FLIP_MS - 1); });
    expect(result.current.isBusy).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.isBusy).toBe(false);
  });

  it('is busy when the card turns face down again', () => {
    allowMotion();
    const { result, rerender } = renderFlip({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    rerender({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    expect(result.current.isBusy).toBe(true);
  });

  it('does not flip a card that was just dealt or replaced', () => {
    allowMotion();
    const { result, rerender } = renderFlip({ cardKey: undefined, isHidden: false, isInFocus: false });
    rerender({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    expect(result.current.isBusy).toBe(false);

    rerender({ cardKey: 'Heart_3', isHidden: false, isInFocus: false });
    expect(result.current.isBusy).toBe(false);
  });

  it('holds focus only when the dealer had focus as the flip began', () => {
    allowMotion();
    const held = renderFlip({ cardKey: 'Club_10', isHidden: true, isInFocus: true });
    // the round ends: control passes back to the human, so the dealer no longer has focus on its own
    held.rerender({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    expect(held.result.current).toEqual({ isBusy: true, holdsFocus: true });
    act(() => { vi.advanceTimersByTime(CARD_FLIP_MS); });
    expect(held.result.current).toEqual({ isBusy: false, holdsFocus: false });

    // flipped in the rail: the table does not bring the dealer forward
    const railed = renderFlip({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    railed.rerender({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    expect(railed.result.current).toEqual({ isBusy: true, holdsFocus: false });
  });

  it('starts the wait over when the card turns again mid-flip', () => {
    allowMotion();
    const { result, rerender } = renderFlip({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    rerender({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    act(() => { vi.advanceTimersByTime(CARD_FLIP_MS - 100); });
    rerender({ cardKey: 'Club_10', isHidden: true, isInFocus: false });
    act(() => { vi.advanceTimersByTime(CARD_FLIP_MS - 1); });
    expect(result.current.isBusy).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.isBusy).toBe(false);
  });

  it('never waits or holds focus with reduced motion', () => {
    allowMotion(true);
    const { result, rerender } = renderFlip({ cardKey: 'Club_10', isHidden: true, isInFocus: true });
    rerender({ cardKey: 'Club_10', isHidden: false, isInFocus: false });
    expect(result.current).toEqual({ isBusy: false, holdsFocus: false });
  });
});
