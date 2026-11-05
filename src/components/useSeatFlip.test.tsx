import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLAPSE_MS, EXPAND_MS, useSeatFlip } from './useSeatFlip';

/** a board with one focused seat and one rail slot per key */
const Board: React.FC<{ focus: string; keys: string[] }> = ({ focus, keys }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  useSeatFlip(ref);
  return (
    <div ref={ref}>
      {keys.map((key) => (
        <div key={key} data-seat-key={key} data-seat-role={key === focus ? 'focus' : 'rail'} />
      ))}
    </div>
  );
};

// focused seats are wide, rail slots are narrow; boxes follow the role each element has
const boxFor = function (this: HTMLElement) {
  const focused = this.dataset.seatRole === 'focus';
  return focused
    ? { left: 300, top: 0, width: 900, height: 420, x: 300, y: 0, right: 1200, bottom: 420, toJSON: () => ({}) }
    : { left: 0, top: 100, width: 260, height: 150, x: 0, y: 100, right: 260, bottom: 250, toJSON: () => ({}) };
};

let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  animate = vi.fn(() => ({ onfinish: null }));
  (HTMLElement.prototype as unknown as { animate: typeof animate }).animate = animate;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(boxFor as () => DOMRect);
});

afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  vi.restoreAllMocks();
});

describe('useSeatFlip', () => {
  it('does not animate on the first render', () => {
    render(<Board focus="chris" keys={['chris', 'dealer']} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('collapses the old seat, then expands the new one after the collapse', () => {
    const { rerender } = render(<Board focus="chris" keys={['chris', 'dealer']} />);
    rerender(<Board focus="dealer" keys={['chris', 'dealer']} />);

    expect(animate).toHaveBeenCalledTimes(2);
    const [collapseFrames, collapseOptions] = animate.mock.calls.find(([, options]) => options.duration === COLLAPSE_MS)!;
    const [, expandOptions] = animate.mock.calls.find(([, options]) => options.duration === EXPAND_MS)!;

    // the collapsing seat starts at the wide focus box and flows back to the rail
    expect(collapseOptions).toMatchObject({ delay: 0 });
    expect(collapseFrames[0].transform).toBe('translate(300px, -100px) scale(3.4615384615384617)');
    // the expanding seat waits for the collapse to finish
    expect(expandOptions).toMatchObject({ delay: COLLAPSE_MS });
  });

  it('does not animate slots whose role did not change', () => {
    const { rerender } = render(<Board focus="chris" keys={['chris', 'dealer']} />);
    rerender(<Board focus="chris" keys={['chris', 'dealer']} />);
    expect(animate).not.toHaveBeenCalled();
  });
});
