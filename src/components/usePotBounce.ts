import React from "react";

/** length of the pot's shimmer and bounce; keep in step with Table.css */
export const POT_BOUNCE_MS = 900;

/**
 * Bounce the pot whenever it grows. Returns a key that changes with each bounce, so the
 * badge restarts its animation, and whether the bounce is still playing. With reduced
 * motion there is no bounce and nothing to wait for.
 * @param pot current pot amount
 */
export function usePotBounce(pot: number): { bounceKey: number; isBouncing: boolean } {
  const [prevPot, setPrevPot] = React.useState(pot);
  const [bounceKey, setBounceKey] = React.useState(0);
  const [settledKey, setSettledKey] = React.useState(0);

  // Start a bounce during render, so the controls never see the larger pot without the wait
  if (pot !== prevPot) {
    setPrevPot(pot);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (pot > prevPot && !reduceMotion) setBounceKey((key) => key + 1);
  }

  React.useEffect(() => {
    if (bounceKey === settledKey) return;
    const timeoutId = window.setTimeout(() => setSettledKey(bounceKey), POT_BOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [bounceKey, settledKey]);

  return { bounceKey, isBouncing: bounceKey !== settledKey };
}
