import { GameReducerAction } from "../../shared/GameReducerAction";

/** A seeded random number generator (mulberry32): the same seed gives the same numbers */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Give an action the time it happened and a seed for anything random it does (a shuffle,
 * a computer player's wager), unless it already has them. The reducer reads both from the
 * action instead of the clock and Math.random, so the same action applied to the same
 * state always gives the same result. Actions are stamped where they are dispatched.
 */
export function stampAction<Action extends GameReducerAction>(action: Action): Action {
  return {
    ...action,
    now: action.now ?? Date.now(),
    seed: action.seed ?? Math.floor(Math.random() * 0x100000000),
  };
}
