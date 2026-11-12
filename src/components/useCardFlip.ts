import React from "react";
import { PlayingCardKey } from "../types";

/** time for the dealer's hole card to turn over; set on the card as --card-flip-ms, which CardContainer.css reads */
export const CARD_FLIP_MS = 500;
/** how long the table waits after the card has turned over to end the round, so the reveal and the result sink in */
export const CARD_REVEAL_PAUSE_MS = 1000;

type Tracked = { cardKey?: PlayingCardKey; isHidden: boolean; isInFocus: boolean };
type Flip = { id: number; holdsFocus: boolean; /** how long the table waits, from the start of the turn */ ms: number };

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Track the dealer's hole card turning over, so play can wait for it. A flip starts
 * when the card already on the table changes between face down and face up: the round
 * ends, or Show Dealer Hand is switched. A card that was just dealt, or taken away,
 * does not flip, and neither does the first render, so a game resumed after a round
 * ended shows the card face up at once. With reduced motion the card swaps faces
 * instantly, so nothing animates and nothing waits.
 *
 * The table waits while the card turns, and when the turn is the reveal that ends the
 * round it keeps waiting for CARD_REVEAL_PAUSE_MS more, so the dealer's hand stays in
 * view for a moment before the table moves on.
 *
 * When the round ends, the seat in control gives up focus at once. A flip that starts
 * while the dealer's seat has focus reports holdsFocus, so the table can keep that seat
 * in view until the wait is over.
 * @param cardKey the dealer's first card, if the dealer holds one
 * @param isHidden true while that card is face down
 * @param isInFocus true when the dealer's seat has focus, before any hold
 * @param isRoundOver true once the round has ended; revealing the card then is followed by the pause
 */
export function useCardFlip(
  cardKey: PlayingCardKey | undefined,
  isHidden: boolean,
  isInFocus: boolean,
  isRoundOver = false,
): { isBusy: boolean; holdsFocus: boolean } {
  const [tracked, setTracked] = React.useState<Tracked>({ cardKey, isHidden, isInFocus });
  const [flip, setFlip] = React.useState<Flip>();

  // Start the flip during render, so the controls never see a change without the wait
  if (tracked.cardKey !== cardKey || tracked.isHidden !== isHidden || tracked.isInFocus !== isInFocus) {
    setTracked({ cardKey, isHidden, isInFocus });
    if (cardKey && tracked.cardKey === cardKey && tracked.isHidden !== isHidden) {
      const ms = CARD_FLIP_MS + (!isHidden && isRoundOver ? CARD_REVEAL_PAUSE_MS : 0);
      setFlip(prefersReducedMotion() ? undefined : { id: (flip?.id ?? 0) + 1, holdsFocus: tracked.isInFocus, ms });
    }
  }

  const flipId = flip?.id;
  const flipMs = flip?.ms;
  React.useEffect(() => {
    if (flipId === undefined || flipMs === undefined) return;
    const timeoutId = window.setTimeout(() => setFlip((current) => current?.id === flipId ? undefined : current), flipMs);
    return () => window.clearTimeout(timeoutId);
  }, [flipId, flipMs]);

  return { isBusy: !!flip, holdsFocus: !!flip?.holdsFocus };
}
