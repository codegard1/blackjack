// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAction } from '../enums';
import { seededRandom, stampAction } from './random';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('seededRandom', () => {
  it('gives the same numbers in [0, 1) for the same seed, and others for another', () => {
    const first = seededRandom(7);
    const again = seededRandom(7);
    const other = seededRandom(8);
    const numbers = Array.from({ length: 50 }, () => first());
    expect(Array.from({ length: 50 }, () => again())).toEqual(numbers);
    expect(Array.from({ length: 50 }, () => other())).not.toEqual(numbers);
    expect(numbers.every((number) => number >= 0 && number < 1)).toBe(true);
  });
});

describe('stampAction', () => {
  it('adds the time and a whole-number seed without changing the action it was given', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const action = { type: GameAction.Deal };
    expect(stampAction(action)).toEqual({ type: GameAction.Deal, now: 1700000000000, seed: 0x80000000 });
    expect(action).toEqual({ type: GameAction.Deal });
  });

  it('keeps a time and a seed the action already has', () => {
    expect(stampAction({ type: GameAction.Shuffle, now: 5, seed: 0 })).toEqual({ type: GameAction.Shuffle, now: 5, seed: 0 });
  });
});
