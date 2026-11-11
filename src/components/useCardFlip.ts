import React from "react";
import { PlayingCardKey } from "../types";

/** time for the dealer's hole card to turn over; set on the card as --card-flip-ms, which CardContainer.css reads */
export const CARD_FLIP_MS = 500;

type Tracked = { cardKey?: PlayingCardKey; isHidden: boolean; isInFocus: boolean };
type Flip = { id: number; holdsFocus: boolean };

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Track the dealer's hole card turning over, so play can wait for it. A flip starts
 * when the card already on the table changes between face down and face up: the round
 * ends, or Show Dealer Hand is switched. A card that was just dealt, or taken away,
 * does not flip, and neither does the first render, so a game resumed after a round
 * ended shows the card face up at once. With reduced motion the card swaps faces
 * instantly, so nothing animates and nothing waits.
 *
 * When the round ends, the seat in control gives up focus at once. A flip that starts
 * while the dealer's seat has focus reports holdsFocus, so the table can keep that seat
 * in view until the card has turned over.
 * @param cardKey the dealer's first card, if the dealer holds one
 * @param isHidden true while that card is face down
 * @param isInFocus true when the dealer's seat has focus, before any hold
 */
export function useCardFlip(cardKey: PlayingCardKey | undefined, isHidden: boolean, isInFocus: boolean): { isBusy: boolean; holdsFocus: boolean } {
  const [tracked, setTracked] = React.useState<Tracked>({ cardKey, isHidden, isInFocus });
  const [flip, setFlip] = React.useState<Flip>();

  // Start the flip during render, so the controls never see a change without the wait
  if (tracked.cardKey !== cardKey || tracked.isHidden !== isHidden || tracked.isInFocus !== isInFocus) {
    setTracked({ cardKey, isHidden, isInFocus });
    if (cardKey && tracked.cardKey === cardKey && tracked.isHidden !== isHidden) {
      setFlip(prefersReducedMotion() ? undefined : { id: (flip?.id ?? 0) + 1, holdsFocus: tracked.isInFocus });
    }
  }

  const flipId = flip?.id;
  React.useEffect(() => {
    if (flipId === undefined) return;
    const timeoutId = window.setTimeout(() => setFlip((current) => current?.id === flipId ? undefined : current), CARD_FLIP_MS);
    return () => window.clearTimeout(timeoutId);
  }, [flipId]);

  return { isBusy: !!flip, holdsFocus: !!flip?.holdsFocus };
}
