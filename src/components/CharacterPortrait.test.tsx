import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAXE_ANIMATIONS } from '../assets/portraits/faxe-animations';
import { HABER_ANIMATIONS } from '../assets/portraits/haber-animations';
import { CharacterPortrait } from './CharacterPortrait';
import { PORTRAIT_GAP_DELAY_MS, PORTRAIT_INITIAL_DELAY_MS } from './usePortraitAnimation';

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMediaMock(initialReducedMotion: boolean): { setReducedMotion: (value: boolean) => void } {
  let matches = initialReducedMotion;
  const listeners = new Set<ChangeListener>();

  vi.spyOn(window, 'matchMedia').mockImplementation((query: string): MediaQueryList => ({
    get matches() {
      return query.includes('prefers-reduced-motion: reduce') ? matches : false;
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as ChangeListener);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as ChangeListener);
    },
    dispatchEvent: () => false,
  }));

  return {
    setReducedMotion: (value: boolean) => {
      matches = value;
      const event = { matches: value, media: '(prefers-reduced-motion: reduce)' } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function mockCanvas2dContext() {
  const frames: Uint8ClampedArray[] = [];
  const putImageData = vi.fn((imageData: ImageData) => {
    frames.push(new Uint8ClampedArray(imageData.data));
  });
  const createImageData = vi.fn((width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  }) as unknown as ImageData);

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
    if (contextId !== '2d') return null;
    return { createImageData, putImageData } as unknown as CanvasRenderingContext2D;
  });

  return { frames, putImageData };
}

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

function advanceUntilActive(canvas: HTMLCanvasElement, maxMs: number) {
  for (let elapsed = 0; elapsed <= maxMs && canvas.dataset.animation === undefined; elapsed += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});

describe('CharacterPortrait', () => {
  it('renders an Avatar for human players and plain img for non-animated characters', () => {
    const { container: human } = render(<CharacterPortrait id="chris" name="Chris" />);
    expect(human.querySelector('.fui-Avatar')).toHaveTextContent('C');
    expect(human.querySelector('canvas')).toBeNull();

    const { container: ogion } = render(<CharacterPortrait id="ogion" name="Ogion" />);
    expect(ogion.querySelector('img')).toBeInTheDocument();
    expect(ogion.querySelector('canvas')).toBeNull();
  });

  it('keeps the accessible portrait img and canvas overlay for Haber and Faxe', () => {
    const { container: haber } = render(<CharacterPortrait id="haber" name="Haber" size="lg" />);
    expect(screen.getByRole('img', { name: /big man with a red-brown beard/ })).toBeInTheDocument();
    const haberCanvas = haber.querySelector('canvas');
    expect(haberCanvas).toHaveAttribute('aria-hidden', 'true');
    expect(haberCanvas).toHaveAttribute('width', '24');
    expect(haberCanvas).toHaveAttribute('height', '24');

    const { container: dealer } = render(<CharacterPortrait id="dealer" name="Faxe" size="md" />);
    expect(screen.getByRole('img', { name: /long black hair, a gold circlet/ })).toBeInTheDocument();
    const dealerCanvas = dealer.querySelector('canvas');
    expect(dealerCanvas).toHaveAttribute('aria-hidden', 'true');
    expect(dealerCanvas).toHaveAttribute('width', '24');
    expect(dealerCanvas).toHaveAttribute('height', '24');
  });

  it('plays Faxe dealer animations with identical start and end frames', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { frames, putImageData } = mockCanvas2dContext();

    const { container } = render(<CharacterPortrait id="dealer" name="Faxe" decorative />);
    const canvas = container.querySelector('canvas')!;
    const validIds = new Set(FAXE_ANIMATIONS.clips.map((clip) => clip.id));

    await act(async () => {
      await Promise.resolve();
    });

    advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
    const playedId = canvas.dataset.animation;
    expect(playedId).toBeDefined();
    expect(validIds.has(playedId!)).toBe(true);
    expect(putImageData).toHaveBeenCalled();

    for (let elapsed = 0; elapsed < 5000 && canvas.dataset.animation !== undefined; elapsed += 20) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
    }

    expect(canvas.dataset.animation).toBeUndefined();
    expect(canvas.style.opacity).toBe('0');
    expect(frames.length).toBeGreaterThanOrEqual(3);
    expect(frames[frames.length - 1]).toEqual(frames[0]);
  });

  it('skips animations when prefers-reduced-motion is enabled', () => {
    vi.useFakeTimers();
    const { putImageData } = mockCanvas2dContext();
    const { container } = render(<CharacterPortrait id="haber" name="Haber" />);

    act(() => {
      vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max + PORTRAIT_GAP_DELAY_MS.max);
    });

    const canvas = container.querySelector('canvas')!;
    expect(putImageData).not.toHaveBeenCalled();
    expect(canvas.dataset.animation).toBeUndefined();
  });

  it('plays full loopable animations with identical start/end frames and semi-random gaps', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { frames, putImageData } = mockCanvas2dContext();

    const { container } = render(<CharacterPortrait id="haber" name="Haber" decorative />);
    const canvas = container.querySelector('canvas')!;
    const validIds = new Set(HABER_ANIMATIONS.clips.map((clip) => clip.id));

    // Flush the dynamic animation chunk promise before the initial delay expires
    await act(async () => {
      await Promise.resolve();
    });

    // Advance until the initial semi-random delay fires and the first clip starts
    advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);

    const firstId = canvas.dataset.animation;
    expect(firstId).toBeDefined();
    expect(validIds.has(firstId!)).toBe(true);
    expect(canvas.style.opacity).toBe('1');
    expect(putImageData).toHaveBeenCalled();

    // Step through the rest of the clip until it finishes and hides the canvas
    for (let elapsed = 0; elapsed < 5000 && canvas.dataset.animation !== undefined; elapsed += 20) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
    }

    expect(canvas.dataset.animation).toBeUndefined();
    expect(canvas.style.opacity).toBe('0');
    expect(frames.length).toBeGreaterThanOrEqual(3);
    // Beginning and ending frames of the played clip must be identical
    expect(frames[frames.length - 1]).toEqual(frames[0]);
    expect(frames.slice(1, -1).some((frame) => !frame.every((v, idx) => v === frames[0][idx]))).toBe(true);

    // Advance until the gap delay expires and a second, different animation begins
    advanceUntilActive(canvas, PORTRAIT_GAP_DELAY_MS.max);

    expect(canvas.dataset.animation).toBeDefined();
    expect(canvas.dataset.animation).not.toBe(firstId);
    expect(canvas.style.opacity).toBe('1');
  });

  it('pauses on hidden tabs, reacts to reduced-motion toggles, and handles missing 2d context', async () => {
    vi.useFakeTimers();
    const { setReducedMotion } = installMatchMediaMock(false);
    const { putImageData } = mockCanvas2dContext();

    const { container, unmount } = render(<CharacterPortrait id="haber" name="Haber" />);
    const canvas = container.querySelector('canvas')!;

    await act(async () => {
      await Promise.resolve();
    });
    advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
    expect(canvas.style.opacity).toBe('1');

    // Hiding the page immediately hides the active clip and clears timers
    act(() => {
      setDocumentHidden(true);
    });
    expect(canvas.style.opacity).toBe('0');
    expect(canvas.dataset.animation).toBeUndefined();
    const callsWhileHidden = putImageData.mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max);
    });
    expect(putImageData).toHaveBeenCalledTimes(callsWhileHidden);

    // Becoming visible again schedules the next animation
    act(() => {
      setDocumentHidden(false);
    });
    advanceUntilActive(canvas, PORTRAIT_GAP_DELAY_MS.max);
    expect(canvas.style.opacity).toBe('1');

    // Enabling reduced motion stops playback; disabling resumes it
    act(() => {
      setReducedMotion(true);
    });
    expect(canvas.style.opacity).toBe('0');
    expect(canvas.dataset.animation).toBeUndefined();

    act(() => {
      setReducedMotion(false);
    });
    advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
    expect(canvas.style.opacity).toBe('1');

    const callsBeforeUnmount = putImageData.mock.calls.length;
    unmount();
    expect(canvas.style.opacity).toBe('0');
    act(() => {
      vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max);
    });
    expect(putImageData).toHaveBeenCalledTimes(callsBeforeUnmount);

    // Also gracefully no-ops when 2D canvas context is unavailable (e.g. default jsdom)
    vi.restoreAllMocks();
    installMatchMediaMock(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<CharacterPortrait id="haber" name="Haber" />);
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max);
    });
  });
});
