import React from "react";

import { PotShare, VisibleToast } from "../types";
import { TOAST_EXIT_MS, TOAST_LIFE_MS } from "./TableToasts";

type Phase = 'closed' | 'open' | 'leaving';

/**
 * The pot's breakdown, shown over the pot when the pot is tapped: one line per player with
 * what they have put in this hand. It closes when the pot is tapped again, after
 * TOAST_LIFE_MS, or when a new hand starts, fading out over TOAST_EXIT_MS as a toast does.
 * @param shares what each player has put into the pot, from `potBreakdown`
 * @param round current hand number
 * @returns the lines to show in the pot's feed, whether the breakdown is open, and the toggle for the pot
 */
export function usePotBreakdown(shares: PotShare[], round: number): { lines: VisibleToast[]; isOpen: boolean; toggle: () => void } {
  const [phase, setPhase] = React.useState<Phase>('closed');

  React.useEffect(() => {
    if (phase === 'closed') return;
    const timeoutId = window.setTimeout(
      () => setPhase(phase === 'open' ? 'leaving' : 'closed'),
      phase === 'open' ? TOAST_LIFE_MS : TOAST_EXIT_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  // the last hand's breakdown has no place in the next
  React.useEffect(() => setPhase('closed'), [round]);

  const hasShares = shares.length > 0;
  const toggle = React.useCallback(() => {
    setPhase((current) => current === 'open' ? 'leaving' : hasShares ? 'open' : 'closed');
  }, [hasShares]);

  const lines = React.useMemo<VisibleToast[]>(() => phase === 'closed' ? [] : shares.map((share, index) => ({
    // negative, so a line never shares an id with a queued toast
    id: -(index + 1),
    title: `${share.name}: $${share.amount}`,
    tone: 'brand',
    kind: 'pot-contribution',
    playerKey: share.playerKey,
    playerName: share.name,
    isLeaving: phase === 'leaving',
  })), [phase, shares]);

  return { lines, isOpen: phase === 'open', toggle };
}
