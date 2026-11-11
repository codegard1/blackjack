import React from "react";

/** time for a seat to collapse from the stage into the queue or the dealer's bench */
export const COLLAPSE_MS = 650;
/** time for a seat to expand onto the stage; starts once the collapse has finished */
export const EXPAND_MS = 700;
/** time for a waiting seat to slide to its new place when the queue moves up */
export const SHIFT_MS = 400;

const COLLAPSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EXPAND_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

type Box = { left: number; top: number; width: number; height: number };
type SeatSnapshot = { role: string; box: Box };
type Move = { key: string; element: HTMLElement; from: Box; to: Box; role: string };

/**
 * Where layout puts an element inside the root. Offsets ignore transforms, so a slot
 * that is still animating measures at its resting place, not somewhere along the way.
 */
function measure(element: HTMLElement, root: HTMLElement): Box {
  let left = 0;
  let top = 0;
  for (let node: HTMLElement | null = element; node && node !== root; node = node.offsetParent as HTMLElement | null) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}

/** Slide a slot that kept its role from its previous place to its current one */
function animateShift({ element, from, to }: Move, reduceMotion: boolean): void {
  if (reduceMotion || typeof element.animate !== 'function') return;
  element.animate(
    [
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` },
      { transform: 'translate(0px, 0px)' },
    ],
    { duration: SHIFT_MS, easing: COLLAPSE_EASING },
  );
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
 * Animate seat slots as they move around the table. Each element with data-seat-key and
 * data-seat-role is tracked. When a slot's role changes (between the stage and the queue
 * or the dealer's bench), it flows from its previous box: a collapsing seat first, then
 * the expanding seat once the collapse is done. A slot that keeps its role but changes
 * place, as when the queue moves up, slides there. Nothing moves when the root itself
 * changed width, since then the whole table was laid out again.
 * @param rootRef positioned element that contains the seat slots
 */
export function useSeatFlip(rootRef: React.RefObject<HTMLElement | null>): void {
  const previous = React.useRef(new Map<string, SeatSnapshot>());
  const previousWidth = React.useRef<number>(undefined);

  // Runs after every render, so each slot is measured where it was just laid out
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const before = previous.current;
    const after = new Map<string, SeatSnapshot>();
    const moves: Move[] = [];
    const shifts: Move[] = [];

    root.querySelectorAll<HTMLElement>('[data-seat-key]').forEach((element) => {
      const key = element.dataset.seatKey ?? '';
      const role = element.dataset.seatRole ?? '';
      const box = measure(element, root);
      after.set(key, { role, box });

      const prior = before.get(key);
      if (!prior) return;
      const move = { key, element, from: prior.box, to: box, role };
      if (prior.role !== role) moves.push(move);
      else if (Math.abs(prior.box.left - box.left) >= 1 || Math.abs(prior.box.top - box.top) >= 1) shifts.push(move);
    });
    previous.current = after;

    const resized = previousWidth.current !== undefined && previousWidth.current !== root.offsetWidth;
    previousWidth.current = root.offsetWidth;
    if (resized) return;

    // an expanding seat waits for any collapse in the same update to finish
    const collapsing = moves.some((move) => move.role !== 'focus');
    moves.forEach((move) => {
      const expanding = move.role === 'focus';
      const delay = expanding && collapsing ? COLLAPSE_MS : 0;
      animateMove(move, delay, reduceMotion);
    });
    shifts.forEach((move) => animateShift(move, reduceMotion));
  });
}
