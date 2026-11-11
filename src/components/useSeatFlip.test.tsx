import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLAPSE_MS, EXPAND_MS, SHIFT_MS, useSeatFlip } from './useSeatFlip';

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

// focused seats are wide; rail slots are narrow and stack in document order
const boxOf = (element: HTMLElement) => element.dataset.seatRole === 'focus'
  ? { left: 300, top: 0, width: 900, height: 420 }
  : { left: 0, top: 100 + 160 * Array.from(element.parentElement?.children ?? []).indexOf(element), width: 260, height: 150 };

let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // the test setup reports reduced motion; these tests need motion
  const matchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({ ...matchMedia(query), matches: false }));
  animate = vi.fn(() => ({ onfinish: null }));
  (HTMLElement.prototype as unknown as { animate: typeof animate }).animate = animate;
  // the hook measures layout offsets, which ignore the transforms of a running animation
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) { return boxOf(this).left; });
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) { return boxOf(this).top; });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) { return boxOf(this).width; });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return boxOf(this).height; });
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

  it('slides a waiting seat to its new place when the queue moves up', () => {
    const { rerender } = render(<Board focus="chris" keys={['chris', 'ogion', 'shevek']} />);
    // Ogion leaves the queue for the stage, so Shevek moves up one place
    rerender(<Board focus="chris" keys={['chris', 'shevek']} />);

    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0];
    expect(options).toMatchObject({ duration: SHIFT_MS });
    expect(frames[0].transform).toBe('translate(0px, 160px)');
  });

  it('does not animate slots that kept their role and their place', () => {
    const { rerender } = render(<Board focus="chris" keys={['chris', 'dealer']} />);
    rerender(<Board focus="chris" keys={['chris', 'dealer']} />);
    expect(animate).not.toHaveBeenCalled();
  });
});
