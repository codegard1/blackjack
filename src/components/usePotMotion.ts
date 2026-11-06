import React from "react";

/** time for the last hand's pot to slide up out of view; keep in step with Table.css */
export const POT_LEAVE_MS = 350;
/** time for a new hand's pot to slide in from the top; keep in step with Table.css */
export const POT_ENTER_MS = 450;
/** length of the pot's shimmer and bounce; keep in step with Table.css */
export const POT_BOUNCE_MS = 900;

/**
 * - idle: at rest
 * - leaving: the last hand's pot slides up out of view
 * - entering: the new hand's pot slides in from the top
 * - bouncing: the pot grew, so it shimmers and bounces
 */
export type PotPhase = 'idle' | 'leaving' | 'entering' | 'bouncing';

type Motion = {
  phase: PotPhase;
  /** changes whenever an animation starts, so the badge remounts and restarts it */
  key: number;
  /** the amount on the badge; the last hand's pot while it leaves */
  shownPot: number;
};

type Tracked = { pot: number; hand: string; isStarted: boolean };

const PHASE_MS: Record<Exclude<PotPhase, 'idle'>, number> = {
  leaving: POT_LEAVE_MS,
  entering: POT_ENTER_MS,
  bouncing: POT_BOUNCE_MS,
};

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Animate the pot between hands and when it grows. When a new hand or game begins,
 * the last hand's pot slides up out of view and the new one slides in from the top,
 * then bounces for the antes. A wager during a hand bounces it. Play waits while
 * any of this runs. With reduced motion nothing animates and nothing waits.
 * @param pot current pot amount
 * @param round current hand number
 * @param isStarted true once a game is in play; false before a game
 */
export function usePotMotion(pot: number, round: number, isStarted: boolean): Motion & { isBusy: boolean } {
  const hand = isStarted ? `hand-${round}` : 'pregame';
  const [tracked, setTracked] = React.useState<Tracked>({ pot, hand, isStarted });
  const [motion, setMotion] = React.useState<Motion>({ phase: 'idle', key: 0, shownPot: pot });

  // Start animations during render, so the controls never see a change without the wait
  if (tracked.pot !== pot || tracked.hand !== hand) {
    setTracked({ pot, hand, isStarted });
    if (prefersReducedMotion()) {
      setMotion((current) => ({ ...current, phase: 'idle', shownPot: pot }));
    } else if (tracked.hand !== hand) {
      // the last hand's pot leaves only when the pot stays in its corner
      const leave = tracked.isStarted && isStarted;
      setMotion((current) => ({ phase: leave ? 'leaving' : 'entering', key: current.key + 1, shownPot: leave ? tracked.pot : pot }));
    } else if (motion.phase !== 'leaving') {
      // while entering, the antes are shown and bounced once the pot has landed
      const bounce = pot > tracked.pot && motion.phase !== 'entering';
      setMotion((current) => bounce
        ? { phase: 'bouncing', key: current.key + 1, shownPot: pot }
        : { ...current, shownPot: pot });
    }
  }

  const potRef = React.useRef(pot);
  React.useEffect(() => {
    potRef.current = pot;
  }, [pot]);

  // Each phase hands over to the next when its animation ends
  const { phase, key } = motion;
  React.useEffect(() => {
    if (phase === 'idle') return;
    const timeoutId = window.setTimeout(() => setMotion((current) => {
      if (current.key !== key) return current;
      const latest = potRef.current;
      if (current.phase === 'leaving') return { phase: 'entering', key: current.key + 1, shownPot: latest };
      if (current.phase === 'entering' && latest > 0) return { phase: 'bouncing', key: current.key + 1, shownPot: latest };
      return { ...current, phase: 'idle', shownPot: latest };
    }), PHASE_MS[phase]);
    return () => window.clearTimeout(timeoutId);
  }, [phase, key]);

  return { ...motion, isBusy: motion.phase !== 'idle' };
}
