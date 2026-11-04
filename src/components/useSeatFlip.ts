import React from "react";

/** time for a seat to collapse into the rail */
export const COLLAPSE_MS = 650;
/** time for a seat to expand out of the rail; starts once the collapse has finished */
export const EXPAND_MS = 700;

const COLLAPSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EXPAND_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

type Box = { left: number; top: number; width: number; height: number };
type SeatSnapshot = { role: string; box: Box };
type Move = { key: string; element: HTMLElement; from: Box; to: Box; role: string };

function measure(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/**
 * Animate one seat slot from its previous box to its current one. The slot is scaled
 * uniformly from its top-left corner, so its contents keep their proportions.
 */
function animateMove({ element, from, to, role }: Move, delay: number, reduceMotion: boolean): void {
  if (reduceMotion || typeof element.animate !== 'function') return;
  if (from.width === 0 || to.width === 0) return;

  const expanding = role === 'focus';
  const scale = from.width / to.width;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const duration = expanding ? EXPAND_MS : COLLAPSE_MS;

  element.style.transformOrigin = '0 0';
  const animation = element.animate(
    [
      // an expanding seat stays hidden until its turn comes, so it does not overlap the collapse
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: expanding ? 0 : 0.4, offset: 0 },
      { opacity: 1, offset: 0.25 },
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 1 },
    ],
    { duration, delay, easing: expanding ? EXPAND_EASING : COLLAPSE_EASING, fill: 'backwards' },
  );
  animation.onfinish = () => {
    element.style.transformOrigin = '';
  };
}

/**
 * Animate seat slots that move between the focus column and the rail. Each element with
 * data-seat-key and data-seat-role is tracked. When a slot's role changes, it flows from
 * its previous box: a collapsing seat first, then the expanding seat once the collapse is done.
 * @param rootRef element that contains the seat slots
 */
export function useSeatFlip(rootRef: React.RefObject<HTMLElement | null>): void {
  const previous = React.useRef(new Map<string, SeatSnapshot>());

  // Runs after every render, so each slot is measured where it was just laid out
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const before = previous.current;
    const after = new Map<string, SeatSnapshot>();
    const moves: Move[] = [];

    root.querySelectorAll<HTMLElement>('[data-seat-key]').forEach((element) => {
      const key = element.dataset.seatKey ?? '';
      const role = element.dataset.seatRole ?? '';
      const box = measure(element);
      after.set(key, { role, box });

      const prior = before.get(key);
      if (prior && prior.role !== role) moves.push({ key, element, from: prior.box, to: box, role });
    });
    previous.current = after;

    // an expanding seat waits for any collapse in the same update to finish
    const collapsing = moves.some((move) => move.role !== 'focus');
    moves.forEach((move) => {
      const expanding = move.role === 'focus';
      const delay = expanding && collapsing && move.key !== 'pot' ? COLLAPSE_MS : 0;
      animateMove(move, delay, reduceMotion);
    });
  });
}
