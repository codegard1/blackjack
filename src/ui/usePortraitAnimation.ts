import React from 'react';

import {
  LoadedPortraitAnimations,
  blitFrame,
  createShuffleBag,
  hasPortraitAnimations,
  loadPortraitAnimations,
  nextDelayMs,
} from './portraitAnimation';

export const PORTRAIT_INITIAL_DELAY_MS = { min: 1500, max: 4500 } as const;
export const PORTRAIT_GAP_DELAY_MS = { min: 10000, max: 25000 } as const;

/**
 * Plays discrete, loopable pixel animations onto an overlaid `<canvas>` at semi-random intervals.
 * Skips loading and playback when `prefers-reduced-motion: reduce` is active or the page is hidden.
 */
export function usePortraitAnimation(
  characterId: string | undefined,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): void {
  React.useEffect(() => {
    if (!characterId || !hasPortraitAnimations(characterId)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const mediaQuery = typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
      : undefined;

    let cancelled = false;
    let loading = false;
    let timerId: number | undefined;
    let loadedSet: LoadedPortraitAnimations | undefined;
    let nextPick: (() => number) | undefined;
    let imageData: ImageData | undefined;

    const clearTimer = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timerId = undefined;
      }
    };

    const hideCanvas = () => {
      canvas.style.opacity = '0';
      delete canvas.dataset.animation;
    };

    const stopPlayback = () => {
      clearTimer();
      hideCanvas();
    };

    const scheduleAfter = (range: { readonly min: number; readonly max: number }) => {
      clearTimer();
      if (cancelled || document.hidden || mediaQuery?.matches || !loadedSet) return;
      timerId = window.setTimeout(playClip, nextDelayMs(range.min, range.max));
    };

    const playClip = () => {
      if (cancelled || document.hidden || mediaQuery?.matches || !loadedSet || !nextPick) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const active = loadedSet;
      const clip = active.getClip(nextPick());
      if (!imageData) {
        imageData = ctx.createImageData(active.size, active.size);
      }
      const buffer = imageData;

      let stepIdx = 0;
      const drawStep = () => {
        if (cancelled || document.hidden || mediaQuery?.matches) {
          hideCanvas();
          return;
        }
        if (stepIdx >= clip.frames.length) {
          hideCanvas();
          scheduleAfter(PORTRAIT_GAP_DELAY_MS);
          return;
        }
        const frame = clip.frames[stepIdx++];
        blitFrame(frame.pixels, active.paletteRgb, buffer.data);
        ctx.putImageData(buffer, 0, 0);
        canvas.dataset.animation = clip.id;
        canvas.style.opacity = '1';
        timerId = window.setTimeout(drawStep, frame.durationMs);
      };

      drawStep();
    };

    const startLoop = (delayRange: { readonly min: number; readonly max: number } = PORTRAIT_INITIAL_DELAY_MS) => {
      if (cancelled || document.hidden || mediaQuery?.matches) return;
      if (loadedSet) {
        scheduleAfter(delayRange);
        return;
      }
      if (loading) return;
      loading = true;
      void loadPortraitAnimations(characterId).then((loaded) => {
        loading = false;
        if (cancelled || !loaded) return;
        loadedSet = loaded;
        nextPick = createShuffleBag(loaded.clipCount);
        scheduleAfter(delayRange);
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPlayback();
      } else {
        startLoop(PORTRAIT_GAP_DELAY_MS);
      }
    };

    const onMediaChange = () => {
      if (mediaQuery?.matches) {
        stopPlayback();
      } else {
        startLoop();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    mediaQuery?.addEventListener?.('change', onMediaChange);

    if (!mediaQuery?.matches) {
      startLoop();
    }

    return () => {
      cancelled = true;
      stopPlayback();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mediaQuery?.removeEventListener?.('change', onMediaChange);
    };
  }, [characterId, canvasRef]);
}
