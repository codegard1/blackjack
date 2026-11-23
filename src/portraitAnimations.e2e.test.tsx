import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOTS, CHARACTERS, Character, DEALER, DEALER_ID, getCharacter, isBotId, isCharacterId } from './characters';
import { CharacterCard } from './components/CharacterCard';
import { CharacterPortrait, PORTRAIT_SIZES } from './components/CharacterPortrait';
import { SeatChip } from './components/SeatChip';
import { TableToasts } from './components/TableToasts';
import { PORTRAIT_GAP_DELAY_MS, PORTRAIT_INITIAL_DELAY_MS } from './components/usePortraitAnimation';
import { SettingContext, settingDefaults } from './context/SettingContext';
import { playerDefaults } from './definitions';
import {
  LoadedPortraitAnimations,
  PORTRAIT_ANIMATION_LOADERS,
  PortraitAnimationSet,
  blitFrame,
  createShuffleBag,
  decodeBaseFrame,
  decodeClip,
  hasPortraitAnimations,
  loadPortraitAnimations,
  nextDelayMs,
  parsePaletteRgb,
} from './functions/portraitAnimation';
import { IPlayer } from './interfaces';
import { VisibleToast } from './types';

const GRID_SIZE = 24;
const PIXEL_COUNT = GRID_SIZE * GRID_SIZE;
const MAX_COMPILED_MODULE_BYTES = 64 * 1024;

interface PortraitSpec {
  character: Character;
  id: string;
  assetStem: string;
  svgFile: string;
  builderRelPath: string;
  compiledRelPath: string;
}

const PORTRAIT_SPECS: readonly PortraitSpec[] = CHARACTERS.map((character) => {
  const assetStem = character.id === DEALER_ID ? 'faxe' : character.id;
  return {
    character,
    id: character.id,
    assetStem,
    svgFile: `${assetStem}.svg`,
    builderRelPath: `scripts/build-${assetStem}-animations.mjs`,
    compiledRelPath: `src/assets/portraits/${assetStem}-animations.ts`,
  };
});

/**
 * Independent SVG ground-truth parser.
 * Validates the 24x24 <svg> header, <rect> count >= 10, hex fills, and pixel bounds,
 * and rasterizes painter's-order rectangles into a 24*24*4 RGBA Uint8ClampedArray (alpha 255).
 */
function parseSvgRgba(svgFileName: string): Uint8ClampedArray {
  const svgPath = resolve('src', 'assets', 'portraits', svgFileName);
  const svg = readFileSync(svgPath, 'utf8');

  const svgOpenMatch = /<svg\b([^>]*)>/i.exec(svg);
  expect(svgOpenMatch).not.toBeNull();
  const svgHeader = svgOpenMatch?.[1] ?? '';
  expect(svgHeader).toMatch(/\bviewBox="0 0 24 24"/);
  expect(svgHeader).toMatch(/\bwidth="24"/);
  expect(svgHeader).toMatch(/\bheight="24"/);

  const rgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
  const rectRe = /<rect\s+([^>]+?)\/>/g;
  let rectCount = 0;
  let match: RegExpExecArray | null;

  while ((match = rectRe.exec(svg)) !== null) {
    rectCount += 1;
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z0-9-]+)="([^"]+)"/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    expect(attrs.fill).toMatch(/^#[0-9a-f]{6}$/i);
    const hex = Number.parseInt(attrs.fill.slice(1), 16);
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;

    const x0 = Number(attrs.x ?? 0);
    const y0 = Number(attrs.y ?? 0);
    const w = Number(attrs.width);
    const h = Number(attrs.height);

    expect(Number.isInteger(x0) && Number.isInteger(y0)).toBe(true);
    expect(Number.isInteger(w) && Number.isInteger(h)).toBe(true);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    expect(x0).toBeGreaterThanOrEqual(0);
    expect(y0).toBeGreaterThanOrEqual(0);
    expect(x0 + w).toBeLessThanOrEqual(GRID_SIZE);
    expect(y0 + h).toBeLessThanOrEqual(GRID_SIZE);

    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        const off = ((y0 + dy) * GRID_SIZE + (x0 + dx)) * 4;
        rgba[off] = r;
        rgba[off + 1] = g;
        rgba[off + 2] = b;
        rgba[off + 3] = 255;
      }
    }
  }

  expect(rectCount).toBeGreaterThanOrEqual(10);
  return rgba;
}

function rgbaPixelToHex(rgba: Uint8ClampedArray, pixelIndex = 0): string {
  const off = pixelIndex * 4;
  const r = rgba[off].toString(16).padStart(2, '0');
  const g = rgba[off + 1].toString(16).padStart(2, '0');
  const b = rgba[off + 2].toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function readPackageJson(): { scripts: Record<string, string> } {
  const raw = readFileSync(resolve('package.json'), 'utf8');
  return JSON.parse(raw) as { scripts: Record<string, string> };
}

async function requireAnimationSet(id: string): Promise<PortraitAnimationSet> {
  expect(Object.hasOwn(PORTRAIT_ANIMATION_LOADERS, id)).toBe(true);
  const loader = PORTRAIT_ANIMATION_LOADERS[id];
  expect(loader).toBeTypeOf('function');
  return loader();
}

async function requireLoadedAnimations(id: string): Promise<LoadedPortraitAnimations> {
  const loaded = await loadPortraitAnimations(id);
  expect(loaded).toBeDefined();
  if (!loaded) {
    throw new Error(`Expected portrait animations to load for "${id}"`);
  }
  return loaded;
}

function decodeBase64Bytes(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

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
  const framesByCanvas = new Map<HTMLCanvasElement, Uint8ClampedArray[]>();
  const putImageData = vi.fn((imageData: ImageData) => {
    frames.push(new Uint8ClampedArray(imageData.data));
  });

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId !== '2d') return null;
    const canvasPutImageData = (imageData: ImageData) => {
      const copy = new Uint8ClampedArray(imageData.data);
      const list = framesByCanvas.get(this) ?? [];
      list.push(copy);
      framesByCanvas.set(this, list);
      putImageData(imageData);
    };
    const createImageData = (width: number, height: number): ImageData => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: 'srgb',
    }) as unknown as ImageData;

    return {
      createImageData,
      putImageData: canvasPutImageData,
    } as unknown as CanvasRenderingContext2D;
  });

  return { frames, framesByCanvas, putImageData };
}

function setDocumentHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

async function flushPortraitLoad(id: string): Promise<void> {
  await act(async () => {
    await loadPortraitAnimations(id);
    await Promise.resolve();
  });
}

function advanceUntilActive(canvas: HTMLCanvasElement, maxMs: number): void {
  for (let elapsed = 0; elapsed <= maxMs && canvas.dataset.animation === undefined; elapsed += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
  }
}

function advanceThroughClip(canvas: HTMLCanvasElement, maxMs = 10000): void {
  for (let elapsed = 0; elapsed < maxMs && canvas.dataset.animation !== undefined; elapsed += 20) {
    act(() => {
      vi.advanceTimersByTime(20);
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});

// =============================================================================
// TIER 1: FEATURE COVERAGE (F1–F5, 25 tests)
// =============================================================================
describe('Tier 1 — Core Feature Coverage', () => {
  describe('F1: Character Registry & Loader Wiring', () => {
    it.each(PORTRAIT_SPECS)(
      'registers $id in CHARACTERS and PORTRAIT_ANIMATION_LOADERS and resolves via loadPortraitAnimations',
      async ({ character, id }) => {
        expect(getCharacter(id)).toBe(character);
        expect(Object.hasOwn(PORTRAIT_ANIMATION_LOADERS, id)).toBe(true);
        expect(hasPortraitAnimations(id)).toBe(true);

        const loaded = await requireLoadedAnimations(id);
        expect(loaded.size).toBe(GRID_SIZE);
        expect(loaded.paletteRgb.length).toBeGreaterThan(0);
        expect(loaded.paletteRgb.length % 3).toBe(0);
        expect(loaded.clipCount).toBe(24);
      },
    );
  });

  describe('F2: Animation Set Completeness & Clip Metadata', () => {
    it.each(PORTRAIT_SPECS)(
      'loads 24 unique lowercase kebab-case clips and valid #rrggbb palette for $id',
      async ({ id }) => {
        const set = await requireAnimationSet(id);
        expect(set.size).toBe(GRID_SIZE);
        expect(set.clips).toHaveLength(24);

        const clipIds = set.clips.map((clip) => clip.id);
        expect(new Set(clipIds).size).toBe(24);
        for (const clipId of clipIds) {
          expect(clipId).toMatch(/^[a-z0-9-]+$/);
        }

        expect(set.palette.length).toBeGreaterThanOrEqual(2);
        expect(set.palette.length).toBeLessThanOrEqual(256);
        for (const hex of set.palette) {
          expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
        }
      },
    );
  });

  describe('F3: Base SVG & Loop Frame Fidelity', () => {
    it.each(PORTRAIT_SPECS)(
      'matches $svgFile pixel-for-pixel across all 576 RGBA pixels in decodeBaseFrame + blitFrame for $id',
      async ({ id, svgFile }) => {
        const set = await requireAnimationSet(id);
        const base = decodeBaseFrame(set);
        const paletteRgb = parsePaletteRgb(set.palette);
        const actualRgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
        blitFrame(base, paletteRgb, actualRgba);

        const expectedRgba = parseSvgRgba(svgFile);
        expect(actualRgba).toEqual(expectedRgba);
      },
    );
  });

  describe('F4: Build Script & Artifact Integration', () => {
    it.each(PORTRAIT_SPECS)(
      'wires $builderRelPath in package.json "animations" and provides $compiledRelPath',
      ({ builderRelPath, compiledRelPath, svgFile }) => {
        const pkg = readPackageJson();
        const animationsScript = pkg.scripts.animations ?? '';
        expect(animationsScript).toContain(builderRelPath);

        const builderPath = resolve(builderRelPath);
        expect(existsSync(builderPath)).toBe(true);
        const builderSource = readFileSync(builderPath, 'utf8');
        expect(builderSource).toContain('portrait-animation-compiler.mjs');
        expect(builderSource).toContain('compileAnimations');
        expect(builderSource).toContain(svgFile);

        expect(existsSync(resolve(compiledRelPath))).toBe(true);
      },
    );
  });

  describe('F5: Portrait UI Playback & Lifecycle', () => {
    it.each(PORTRAIT_SPECS)(
      'renders accessible <img> + 24x24 <canvas> overlay and plays SVG-looping clip for $id',
      async ({ character, id, svgFile }) => {
        vi.useFakeTimers();
        installMatchMediaMock(false);
        const { framesByCanvas, putImageData } = mockCanvas2dContext();

        const { container } = render(<CharacterPortrait id={id} name={character.name} />);
        expect(screen.getByRole('img', { name: character.portraitAlt })).toBeInTheDocument();

        const canvas = container.querySelector('canvas');
        expect(canvas).not.toBeNull();
        if (!canvas) throw new Error(`Missing canvas overlay for "${id}"`);

        expect(canvas).toHaveAttribute('aria-hidden', 'true');
        expect(canvas).toHaveAttribute('width', '24');
        expect(canvas).toHaveAttribute('height', '24');

        const loaded = await requireLoadedAnimations(id);
        const validIds = new Set(Array.from({ length: loaded.clipCount }, (_, i) => loaded.getClip(i).id));
        await flushPortraitLoad(id);

        advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
        const playedId = canvas.dataset.animation;
        expect(playedId).toBeDefined();
        expect(validIds.has(playedId ?? '')).toBe(true);
        expect(canvas.style.opacity).toBe('1');
        expect(putImageData).toHaveBeenCalled();

        advanceThroughClip(canvas);
        expect(canvas.dataset.animation).toBeUndefined();
        expect(canvas.style.opacity).toBe('0');

        const playedFrames = framesByCanvas.get(canvas) ?? [];
        expect(playedFrames.length).toBeGreaterThanOrEqual(3);

        const expectedRgba = parseSvgRgba(svgFile);
        expect(playedFrames[0]).toEqual(expectedRgba);
        expect(playedFrames[playedFrames.length - 1]).toEqual(expectedRgba);
      },
    );
  });
});

// =============================================================================
// TIER 2: BOUNDARY & CORNER CASES (F1–F5, 30 tests)
// =============================================================================
describe('Tier 2 — Boundary & Corner Cases', () => {
  describe('F1: Registry & Loader Boundary Cases', () => {
    it('handles undefined and empty string IDs without throwing', async () => {
      expect(hasPortraitAnimations(undefined)).toBe(false);
      expect(hasPortraitAnimations('')).toBe(false);
      expect(await loadPortraitAnimations('')).toBeUndefined();
      expect(getCharacter(undefined)).toBeUndefined();
      expect(getCharacter('')).toBeUndefined();
    });

    it('rejects SVG filename "faxe" and case-mismatched IDs such as "OGION" and "HABER"', async () => {
      expect(hasPortraitAnimations('faxe')).toBe(false);
      expect(await loadPortraitAnimations('faxe')).toBeUndefined();
      expect(hasPortraitAnimations('OGION')).toBe(false);
      expect(await loadPortraitAnimations('OGION')).toBeUndefined();
      expect(hasPortraitAnimations('HABER')).toBe(false);
      expect(await loadPortraitAnimations('HABER')).toBeUndefined();
    });

    it('ignores Object.prototype keys safely via own-property checks', async () => {
      for (const protoKey of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
        expect(hasPortraitAnimations(protoKey)).toBe(false);
        expect(await loadPortraitAnimations(protoKey)).toBeUndefined();
      }
    });

    it('returns undefined/false for unknown human player IDs', async () => {
      for (const humanId of ['chris', 'guest-seat-1', 'unknown-player']) {
        expect(getCharacter(humanId)).toBeUndefined();
        expect(isCharacterId(humanId)).toBe(false);
        expect(hasPortraitAnimations(humanId)).toBe(false);
        expect(await loadPortraitAnimations(humanId)).toBeUndefined();
      }
    });

    it('maintains CHARACTERS, BOTS, DEALER, isCharacterId, and isBotId invariants', () => {
      expect(CHARACTERS).toHaveLength(5);
      expect(BOTS).toHaveLength(4);
      expect(DEALER.id).toBe(DEALER_ID);
      expect(isCharacterId(DEALER_ID)).toBe(true);
      expect(isBotId(DEALER_ID)).toBe(false);
      for (const bot of BOTS) {
        expect(isCharacterId(bot.id)).toBe(true);
        expect(isBotId(bot.id)).toBe(true);
      }
    });
  });

  describe('F2: Clip, Delta-RLE & Timing Boundary Cases', () => {
    it.each(PORTRAIT_SPECS)(
      'enforces step count (3..255), duration ticks (10..2550ms step 10), and palette bounds on all 24 clips of $id',
      async ({ id }) => {
        const set = await requireAnimationSet(id);
        const base = decodeBaseFrame(set);
        expect(set.clips).toHaveLength(24);

        for (let i = 0; i < set.clips.length; i += 1) {
          const clip = decodeClip(set, base, i);
          expect(clip.frames.length).toBeGreaterThanOrEqual(3);
          expect(clip.frames.length).toBeLessThanOrEqual(255);

          for (const frame of clip.frames) {
            expect(frame.pixels).toHaveLength(PIXEL_COUNT);
            expect(frame.durationMs).toBeGreaterThanOrEqual(10);
            expect(frame.durationMs).toBeLessThanOrEqual(2550);
            expect(frame.durationMs % 10).toBe(0);
            for (const colorIdx of frame.pixels) {
              expect(colorIdx).toBeLessThan(set.palette.length);
            }
          }
        }
      },
    );

    it('decodes synthetic clips with extended (>= 127) run headers and fromPrev=1 chaining', () => {
      // Unique frame 1: fromBase (0x7f -> uint16BE 127 runs of pixel i = color 1)
      // Unique frame 2: fromPrev (0x80 | 1 = 0x81 -> 1 run at pos 0, len 1, color 0)
      const bytes: number[] = [2, 0x7f, 0x00, 127];
      for (let i = 0; i < 127; i += 1) {
        bytes.push(i >> 2, (i & 3) << 6, 1);
      }
      bytes.push(0x81, 0, 0, 0);
      // 4 steps: base (10ms), frame1 (2550ms), frame2 (120ms), base (10ms)
      bytes.push(4, 0, 1, 1, 255, 2, 12, 0, 1);

      const synthetic: PortraitAnimationSet = {
        size: 24,
        palette: ['#000000', '#ffffff'],
        base: Buffer.from([0, 255, 0, 255, 0, 66]).toString('base64'),
        clips: [{ id: 'extended-chained', data: Buffer.from(bytes).toString('base64') }],
      };

      const base = decodeBaseFrame(synthetic);
      const clip = decodeClip(synthetic, base, 0);
      expect(clip.frames).toHaveLength(4);
      expect(clip.frames[0].durationMs).toBe(10);
      expect(clip.frames[1].durationMs).toBe(2550);
      expect(clip.frames[1].pixels[0]).toBe(1);
      expect(clip.frames[1].pixels[126]).toBe(1);
      expect(clip.frames[1].pixels[127]).toBe(0);
      expect(clip.frames[2].durationMs).toBe(120);
      expect(clip.frames[2].pixels[0]).toBe(0);
      expect(clip.frames[2].pixels[1]).toBe(1);
    });

    it('throws on out-of-bounds getClip(-1) and getClip(clipCount)', async () => {
      const loaded = await requireLoadedAnimations('haber');
      expect(() => loaded.getClip(-1)).toThrow();
      expect(() => loaded.getClip(loaded.clipCount)).toThrow();
    });

    it('satisfies createShuffleBag (0, 1, 24) and nextDelayMs (min === max, bounds) invariants', () => {
      const zeroBag = createShuffleBag(0);
      const oneBag = createShuffleBag(1);
      expect([zeroBag(), zeroBag()]).toEqual([0, 0]);
      expect([oneBag(), oneBag(), oneBag()]).toEqual([0, 0, 0]);

      const bag24 = createShuffleBag(24);
      let prev = -1;
      for (let cycle = 0; cycle < 10; cycle += 1) {
        const seen = new Set<number>();
        for (let step = 0; step < 24; step += 1) {
          const drawn = bag24();
          expect(drawn).toBeGreaterThanOrEqual(0);
          expect(drawn).toBeLessThan(24);
          expect(drawn).not.toBe(prev);
          seen.add(drawn);
          prev = drawn;
        }
        expect(seen.size).toBe(24);
      }

      expect(nextDelayMs(500, 500)).toBe(500);
      expect(nextDelayMs(1500, 4500, () => 0)).toBe(1500);
      expect(nextDelayMs(1500, 4500, () => 0.999999)).toBe(4500);
    });
  });

  describe('F3: Loop & Non-Triviality Boundary Cases', () => {
    it.each(PORTRAIT_SPECS)(
      'guarantees every clip of $id loops back to $svgFile with no consecutive duplicate frames and non-trivial middle motion',
      async ({ id, svgFile }) => {
        const set = await requireAnimationSet(id);
        const base = decodeBaseFrame(set);
        const paletteRgb = parsePaletteRgb(set.palette);
        const expectedSvgRgba = parseSvgRgba(svgFile);

        const startRgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
        const endRgba = new Uint8ClampedArray(PIXEL_COUNT * 4);

        for (let i = 0; i < set.clips.length; i += 1) {
          const clip = decodeClip(set, base, i);
          const first = clip.frames[0];
          const last = clip.frames[clip.frames.length - 1];

          expect(first.pixels).toEqual(base);
          expect(last.pixels).toEqual(base);

          blitFrame(first.pixels, paletteRgb, startRgba);
          blitFrame(last.pixels, paletteRgb, endRgba);
          expect(startRgba).toEqual(expectedSvgRgba);
          expect(endRgba).toEqual(expectedSvgRgba);

          let hasNonBaseMiddleFrame = false;
          for (let f = 1; f < clip.frames.length; f += 1) {
            expect(clip.frames[f].pixels).not.toEqual(clip.frames[f - 1].pixels);
            if (!clip.frames[f].pixels.every((px, idx) => px === base[idx])) {
              hasNonBaseMiddleFrame = true;
            }
          }
          expect(hasNonBaseMiddleFrame).toBe(true);
        }
      },
    );
  });

  describe('F4: Raw Delta-RLE Binary Stream & Compiler Boundary Cases', () => {
    it.each(PORTRAIT_SPECS)(
      'validates raw base RLE and exact delta-RLE byte streams for all clips of $id',
      async ({ id }) => {
        const set = await requireAnimationSet(id);

        // Verify raw base RLE byte pairs sum to exactly 576 pixels
        const baseBytes = decodeBase64Bytes(set.base);
        expect(baseBytes.length % 2).toBe(0);
        let decodedBasePixels = 0;
        for (let i = 0; i < baseBytes.length; i += 2) {
          const colorIdx = baseBytes[i];
          const runLen = baseBytes[i + 1];
          expect(colorIdx).toBeLessThan(set.palette.length);
          expect(runLen).toBeGreaterThanOrEqual(1);
          expect(runLen).toBeLessThanOrEqual(255);
          decodedBasePixels += runLen;
        }
        expect(decodedBasePixels).toBe(PIXEL_COUNT);

        // Verify every clip's delta-RLE stream consumes exact byte length and respects all bounds
        for (const clip of set.clips) {
          const bytes = decodeBase64Bytes(clip.data);
          let offset = 0;
          const uniqueCount = bytes[offset++];
          expect(uniqueCount).toBeGreaterThanOrEqual(1);
          expect(uniqueCount).toBeLessThanOrEqual(255);

          for (let u = 1; u <= uniqueCount; u += 1) {
            const header = bytes[offset++];
            const rawCount = header & 0x7f;
            const runCount = rawCount === 127 ? (bytes[offset++] << 8) | bytes[offset++] : rawCount;
            expect(offset + runCount * 3).toBeLessThanOrEqual(bytes.length);

            for (let r = 0; r < runCount; r += 1) {
              const b0 = bytes[offset++];
              const b1 = bytes[offset++];
              const color = bytes[offset++];
              const pos = (b0 << 2) | (b1 >> 6);
              const len = (b1 & 0x3f) + 1;
              expect(pos).toBeGreaterThanOrEqual(0);
              expect(len).toBeGreaterThanOrEqual(1);
              expect(len).toBeLessThanOrEqual(64);
              expect(pos + len).toBeLessThanOrEqual(PIXEL_COUNT);
              expect(color).toBeLessThan(set.palette.length);
            }
          }

          const stepCount = bytes[offset++];
          expect(stepCount).toBeGreaterThanOrEqual(3);
          expect(stepCount).toBeLessThanOrEqual(255);
          expect(offset + stepCount * 2).toBe(bytes.length);

          for (let s = 0; s < stepCount; s += 1) {
            const frameIdx = bytes[offset++];
            const ticks = bytes[offset++];
            expect(frameIdx).toBeLessThanOrEqual(uniqueCount);
            expect(ticks).toBeGreaterThanOrEqual(1);
            expect(ticks).toBeLessThanOrEqual(255);
          }
          expect(offset).toBe(bytes.length);
        }
      },
    );

    it('provides shared portrait-animation-compiler.mjs and valid "portraits" SVG generator script', () => {
      const compilerPath = resolve('scripts', 'portrait-animation-compiler.mjs');
      expect(existsSync(compilerPath)).toBe(true);
      const compilerSource = readFileSync(compilerPath, 'utf8');
      expect(compilerSource).toContain('export function loadBaseGridFromSvg');
      expect(compilerSource).toContain('export function loopClip');
      expect(compilerSource).toContain('export function compileAnimations');

      const pkg = readPackageJson();
      expect(pkg.scripts.portraits).toContain('scripts/build-portraits.mjs');
      expect(existsSync(resolve('scripts', 'build-portraits.mjs'))).toBe(true);
    });
  });

  describe('F5: Portrait UI Boundary & Lifecycle Cases', () => {
    it('supports PORTRAIT_SIZES sm/md/lg and maps non-character Avatar lg to 128 without canvas or img', () => {
      expect(PORTRAIT_SIZES).toEqual({ sm: 24, md: 48, lg: 144 });

      for (const size of ['sm', 'md', 'lg'] as const) {
        const expectedPx = PORTRAIT_SIZES[size];
        const { container, unmount } = render(<CharacterPortrait id="haber" name="Haber" size={size} />);
        const wrapper = container.querySelector<HTMLElement>('span');
        const img = container.querySelector('img');
        const canvas = container.querySelector('canvas');
        expect(wrapper?.style.width).toBe(`${expectedPx}px`);
        expect(wrapper?.style.height).toBe(`${expectedPx}px`);
        expect(img).toHaveAttribute('width', String(expectedPx));
        expect(img).toHaveAttribute('height', String(expectedPx));
        expect(canvas).toHaveAttribute('width', '24');
        expect(canvas).toHaveAttribute('height', '24');
        unmount();
      }

      const { container: humanLg } = render(<CharacterPortrait id="chris" name="Chris" size="lg" />);
      const avatar = humanLg.querySelector<HTMLElement>('.fui-Avatar');
      expect(avatar).not.toBeNull();
      expect(avatar).toHaveTextContent('C');
      expect(avatar ? getComputedStyle(avatar).width : '').toBe('128px');
      expect(humanLg.querySelector('img')).toBeNull();
      expect(humanLg.querySelector('canvas')).toBeNull();
    });

    it('applies decorative={true} vs decorative={false} semantics on character portraits and human Avatars', () => {
      const { container: decChar, unmount: unmountDecChar } = render(
        <CharacterPortrait id="dealer" name="Faxe" decorative />,
      );
      expect(decChar.querySelector('img')).toHaveAttribute('alt', '');
      expect(screen.queryByRole('img')).toBeNull();
      unmountDecChar();

      render(<CharacterPortrait id="dealer" name="Faxe" decorative={false} />);
      expect(screen.getByRole('img', { name: DEALER.portraitAlt })).toBeInTheDocument();

      const { container: decHuman, unmount: unmountDecHuman } = render(
        <CharacterPortrait id="chris" name="Chris" decorative />,
      );
      expect(decHuman.querySelector('.fui-Avatar')).toHaveAttribute('aria-hidden', 'true');
      unmountDecHuman();

      const { container: accHuman } = render(<CharacterPortrait id="chris" name="Chris" />);
      expect(accHuman.querySelector('.fui-Avatar')).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('respects default reduced-motion and reacts to runtime reduced-motion toggles (false -> true -> false)', async () => {
      vi.useFakeTimers();
      const { putImageData: defaultPut } = mockCanvas2dContext();
      const { container: reducedContainer, unmount: unmountReduced } = render(
        <CharacterPortrait id="haber" name="Haber" />,
      );
      act(() => {
        vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max + PORTRAIT_GAP_DELAY_MS.max);
      });
      expect(defaultPut).not.toHaveBeenCalled();
      expect(reducedContainer.querySelector('canvas')?.dataset.animation).toBeUndefined();
      unmountReduced();

      vi.restoreAllMocks();
      const { setReducedMotion } = installMatchMediaMock(false);
      const { putImageData } = mockCanvas2dContext();

      const { container } = render(<CharacterPortrait id="haber" name="Haber" />);
      const canvas = container.querySelector('canvas')!;
      await flushPortraitLoad('haber');

      advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
      expect(canvas.style.opacity).toBe('1');
      expect(canvas.dataset.animation).toBeDefined();

      act(() => {
        setReducedMotion(true);
      });
      expect(canvas.style.opacity).toBe('0');
      expect(canvas.dataset.animation).toBeUndefined();

      const callsWhileReduced = putImageData.mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max);
      });
      expect(putImageData).toHaveBeenCalledTimes(callsWhileReduced);

      act(() => {
        setReducedMotion(false);
      });
      advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
      expect(canvas.style.opacity).toBe('1');
      expect(canvas.dataset.animation).toBeDefined();
    });

    it('pauses when document.hidden is true on mount or mid-clip, and resumes when visible', async () => {
      vi.useFakeTimers();
      installMatchMediaMock(false);
      const { putImageData } = mockCanvas2dContext();

      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      const { container } = render(<CharacterPortrait id="dealer" name="Faxe" />);
      const canvas = container.querySelector('canvas')!;

      act(() => {
        vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max + PORTRAIT_GAP_DELAY_MS.max);
      });
      expect(putImageData).not.toHaveBeenCalled();
      expect(canvas.dataset.animation).toBeUndefined();

      act(() => {
        setDocumentHidden(false);
      });
      await flushPortraitLoad('dealer');
      advanceUntilActive(canvas, PORTRAIT_GAP_DELAY_MS.max);
      expect(canvas.style.opacity).toBe('1');
      expect(canvas.dataset.animation).toBeDefined();

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

      act(() => {
        setDocumentHidden(false);
      });
      advanceUntilActive(canvas, PORTRAIT_GAP_DELAY_MS.max);
      expect(canvas.style.opacity).toBe('1');
    });

    it('no-ops gracefully without throwing when canvas getContext("2d") returns null', async () => {
      vi.useFakeTimers();
      installMatchMediaMock(false);
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

      const { container } = render(<CharacterPortrait id="haber" name="Haber" />);
      const canvas = container.querySelector('canvas')!;
      await flushPortraitLoad('haber');

      act(() => {
        vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max + PORTRAIT_GAP_DELAY_MS.max);
      });

      expect(canvas.dataset.animation).toBeUndefined();
      expect(canvas.style.opacity).not.toBe('1');
    });

    it('cleans up timers and canvas state on unmount mid-clip and mid-load', async () => {
      vi.useFakeTimers();
      installMatchMediaMock(false);
      const { putImageData } = mockCanvas2dContext();

      // Case 1: unmount synchronously mid-load before promise continuation runs
      const midLoad = render(<CharacterPortrait id="haber" name="Haber" />);
      midLoad.unmount();
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        vi.advanceTimersByTime(PORTRAIT_INITIAL_DELAY_MS.max + PORTRAIT_GAP_DELAY_MS.max);
      });
      expect(putImageData).not.toHaveBeenCalled();

      // Case 2: unmount mid-clip during active playback
      const { container, unmount } = render(<CharacterPortrait id="haber" name="Haber" />);
      const canvas = container.querySelector('canvas')!;
      await flushPortraitLoad('haber');
      advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
      expect(canvas.style.opacity).toBe('1');

      const callsAtUnmount = putImageData.mock.calls.length;
      unmount();
      expect(canvas.style.opacity).toBe('0');
      expect(canvas.dataset.animation).toBeUndefined();

      act(() => {
        vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max + 5000);
      });
      expect(putImageData).toHaveBeenCalledTimes(callsAtUnmount);
    });

    it('disables animations and unmounts canvas overlay when isAnimationsEnabled is false', () => {
      const { container } = render(
        <SettingContext.Provider value={{ ...settingDefaults, isAnimationsEnabled: false }}>
          <CharacterPortrait id="dealer" name="Faxe" />
        </SettingContext.Provider>,
      );
      expect(container.querySelector('img')).toBeInTheDocument();
      expect(container.querySelector('canvas')).toBeNull();
    });
  });
});

// =============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (6 tests)
// =============================================================================
describe('Tier 3 — Cross-Feature Combinations', () => {
  it('F1 x F2 x F3: resolves CHARACTERS -> loaders -> memoized promises and clip identities across all 5 characters', async () => {
    for (const { id } of PORTRAIT_SPECS) {
      const p1 = loadPortraitAnimations(id);
      const p2 = loadPortraitAnimations(id);
      expect(p1).toBe(p2);

      const loaded = await p1;
      expect(loaded).toBeDefined();
      if (!loaded) throw new Error(`Missing loaded animations for "${id}"`);
      expect(loaded.clipCount).toBe(24);

      for (let i = 0; i < loaded.clipCount; i += 1) {
        const c1 = loaded.getClip(i);
        const c2 = loaded.getClip(i);
        expect(c1).toBe(c2);
      }
    }
  });

  it('F1 x F2 x F3: aligns character.accent with SVG (0,0) background pixel and keeps clip ID sets distinct across characters', async () => {
    const clipIdSignatures = new Set<string>();

    for (const { character, id, svgFile } of PORTRAIT_SPECS) {
      const svgRgba = parseSvgRgba(svgFile);
      expect(rgbaPixelToHex(svgRgba, 0)).toBe(character.accent.toLowerCase());

      const loaded = await requireLoadedAnimations(id);
      const firstClip = loaded.getClip(0);
      const baseRgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
      blitFrame(firstClip.frames[0].pixels, loaded.paletteRgb, baseRgba);
      expect(rgbaPixelToHex(baseRgba, 0)).toBe(character.accent.toLowerCase());

      const ids = Array.from({ length: loaded.clipCount }, (_, i) => loaded.getClip(i).id).sort().join(',');
      clipIdSignatures.add(ids);
    }

    expect(clipIdSignatures.size).toBe(PORTRAIT_SPECS.length);
  });

  it('F2 x F3: decodes all 24 clips sequentially without mutating base or cached frames and always outputs alpha 255', async () => {
    for (const { id } of PORTRAIT_SPECS) {
      const set = await requireAnimationSet(id);
      const base = decodeBaseFrame(set);
      const baseSnapshot = new Uint8Array(base);
      const paletteRgb = parsePaletteRgb(set.palette);
      const loaded = await requireLoadedAnimations(id);

      const cachedFirstFrames: Uint8Array[] = [];
      for (let i = 0; i < loaded.clipCount; i += 1) {
        const clip = loaded.getClip(i);
        cachedFirstFrames.push(new Uint8Array(clip.frames[0].pixels));
        for (const frame of clip.frames) {
          const rgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
          blitFrame(frame.pixels, paletteRgb, rgba);
          for (let px = 0; px < PIXEL_COUNT; px += 1) {
            expect(rgba[px * 4 + 3]).toBe(255);
          }
        }
      }

      expect(base).toEqual(baseSnapshot);
      for (let i = 0; i < loaded.clipCount; i += 1) {
        expect(loaded.getClip(i).frames[0].pixels).toEqual(cachedFirstFrames[i]);
      }
    }
  });

  it('F1 x F4: cross-checks package.json "animations" scripts, compiler imports, SVG assets, and runtime loaders', async () => {
    const pkg = readPackageJson();
    const animationsScript = pkg.scripts.animations ?? '';
    const scriptMatches = Array.from(animationsScript.matchAll(/node\s+(scripts\/build-[a-z0-9-]+-animations\.mjs)/g));
    const scriptPaths = scriptMatches.map((m) => m[1]);

    expect(scriptPaths.length).toBeGreaterThanOrEqual(PORTRAIT_SPECS.length);
    expect(new Set(scriptPaths).size).toBe(scriptPaths.length);

    for (const { builderRelPath, compiledRelPath, id, svgFile } of PORTRAIT_SPECS) {
      expect(scriptPaths).toContain(builderRelPath);
      expect(existsSync(resolve(builderRelPath))).toBe(true);
      expect(existsSync(resolve('src', 'assets', 'portraits', svgFile))).toBe(true);
      expect(existsSync(resolve(compiledRelPath))).toBe(true);
      const set = await requireAnimationSet(id);
      expect(set.clips).toHaveLength(24);
    }
  });

  it('F2 x F5: plays consecutive clips across PORTRAIT_GAP_DELAY_MS with opacity 1->0 transitions and non-repeating clip IDs', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { framesByCanvas } = mockCanvas2dContext();

    for (const id of ['haber', 'dealer'] as const) {
      const { container, unmount } = render(<CharacterPortrait id={id} name={id} decorative />);
      const canvas = container.querySelector('canvas')!;
      await flushPortraitLoad(id);

      advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
      const firstId = canvas.dataset.animation;
      expect(firstId).toBeDefined();
      expect(canvas.style.opacity).toBe('1');

      advanceThroughClip(canvas);
      expect(canvas.style.opacity).toBe('0');
      expect(canvas.dataset.animation).toBeUndefined();

      advanceUntilActive(canvas, PORTRAIT_GAP_DELAY_MS.max);
      const secondId = canvas.dataset.animation;
      expect(secondId).toBeDefined();
      expect(secondId).not.toBe(firstId);
      expect(canvas.style.opacity).toBe('1');

      advanceThroughClip(canvas);
      expect(canvas.style.opacity).toBe('0');
      expect((framesByCanvas.get(canvas) ?? []).length).toBeGreaterThanOrEqual(6);
      unmount();
    }
  });

  it('F1 x F3 x F5: verifies rendered UI putImageData pixel buffers match blitFrame(getClip) step-for-step across all 5 characters', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { framesByCanvas } = mockCanvas2dContext();

    for (const { character, id, svgFile } of PORTRAIT_SPECS) {
      const { container, unmount } = render(<CharacterPortrait id={id} name={character.name} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).not.toBeNull();
      if (!canvas) throw new Error(`Missing canvas for "${id}"`);

      const loaded = await requireLoadedAnimations(id);
      await flushPortraitLoad(id);

      advanceUntilActive(canvas, PORTRAIT_INITIAL_DELAY_MS.max);
      const activeId = canvas.dataset.animation;
      expect(activeId).toBeDefined();

      advanceThroughClip(canvas);
      const renderedFrames = framesByCanvas.get(canvas) ?? [];

      let matchingClip = null;
      for (let i = 0; i < loaded.clipCount; i += 1) {
        const candidate = loaded.getClip(i);
        if (candidate.id === activeId) {
          matchingClip = candidate;
          break;
        }
      }
      expect(matchingClip).not.toBeNull();
      if (!matchingClip) throw new Error(`Clip "${String(activeId)}" not found in loaded set for "${id}"`);

      expect(renderedFrames).toHaveLength(matchingClip.frames.length);
      const expectedStepRgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
      for (let s = 0; s < matchingClip.frames.length; s += 1) {
        blitFrame(matchingClip.frames[s].pixels, loaded.paletteRgb, expectedStepRgba);
        expect(renderedFrames[s]).toEqual(expectedStepRgba);
      }

      const svgRgba = parseSvgRgba(svgFile);
      expect(renderedFrames[0]).toEqual(svgRgba);
      expect(renderedFrames[renderedFrames.length - 1]).toEqual(svgRgba);
      unmount();
    }
  });
});

// =============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 tests)
// =============================================================================
describe('Tier 4 — Real-World Application Scenarios', () => {
  it('Scenario 1: renders SeatChip (md, decorative), CharacterCard (lg, accessible), and TableToasts (sm, decorative) across all 5 characters', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { framesByCanvas } = mockCanvas2dContext();

    for (const { character, id, svgFile } of PORTRAIT_SPECS) {
      const seatPlayer: IPlayer = {
        ...playerDefaults,
        key: id,
        title: character.name,
        bank: 500,
        isNPC: true,
      };
      const toast: VisibleToast = {
        id: 1,
        title: `${character.name} wagered $25`,
        subtitle: 'Pot: $50',
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
        playerKey: id,
        playerName: character.name,
        isLeaving: false,
      };

      const { container } = render(
        <div>
          <section data-testid="seat-chip">
            <SeatChip player={seatPlayer} status={{ text: 'Hit', color: 'brand', appearance: 'tint' }} />
          </section>
          <section data-testid="character-card">
            <CharacterCard character={character} />
          </section>
          <section data-testid="table-toasts">
            <TableToasts toasts={[toast]} />
          </section>
        </div>,
      );

      // SeatChip: md (48x48), decorative
      const seatEl = screen.getByTestId('seat-chip');
      expect(within(seatEl).getByText(`${character.name} ($500)`)).toBeInTheDocument();
      const seatImg = seatEl.querySelector('img');
      const seatCanvas = seatEl.querySelector('canvas');
      expect(seatImg).toHaveAttribute('alt', '');
      expect(seatImg).toHaveAttribute('width', '48');
      expect(seatCanvas).not.toBeNull();

      // CharacterCard: lg (144x144), accessible alt
      const cardEl = screen.getByTestId('character-card');
      expect(within(cardEl).getByRole('img', { name: character.portraitAlt })).toHaveAttribute('width', '144');
      const cardCanvas = cardEl.querySelector('canvas');
      expect(cardCanvas).not.toBeNull();

      // TableToasts: sm (24x24), decorative
      const toastEl = screen.getByTestId('table-toasts');
      expect(within(toastEl).getByRole('status')).toHaveTextContent(`${character.name} wagered $25`);
      const toastImg = toastEl.querySelector('img');
      const toastCanvas = toastEl.querySelector('canvas');
      expect(toastImg).toHaveAttribute('alt', '');
      expect(toastImg).toHaveAttribute('width', '24');
      expect(toastCanvas).not.toBeNull();

      // Verify one hosted canvas plays back accurately to SVG ground truth
      await flushPortraitLoad(id);
      expect(container.querySelectorAll('canvas')).toHaveLength(3);
      if (!cardCanvas) throw new Error(`Missing CharacterCard canvas for "${id}"`);
      advanceUntilActive(cardCanvas, PORTRAIT_INITIAL_DELAY_MS.max);
      expect(cardCanvas.dataset.animation).toBeDefined();
      advanceThroughClip(cardCanvas);
      const cardFrames = framesByCanvas.get(cardCanvas) ?? [];
      expect(cardFrames.length).toBeGreaterThanOrEqual(3);
      const svgRgba = parseSvgRgba(svgFile);
      expect(cardFrames[0]).toEqual(svgRgba);
      expect(cardFrames[cardFrames.length - 1]).toEqual(svgRgba);

      cleanup();
    }
  });

  it('Scenario 2: runs all 5 character portraits concurrently at a simulated table without cross-talk', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { framesByCanvas } = mockCanvas2dContext();

    render(
      <div>
        {PORTRAIT_SPECS.map(({ character, id }) => (
          <div key={id} data-testid={`table-seat-${id}`}>
            <CharacterPortrait id={id} name={character.name} size="md" />
          </div>
        ))}
      </div>,
    );

    const validIdsByChar = new Map<string, Set<string>>();
    for (const { id } of PORTRAIT_SPECS) {
      const loaded = await requireLoadedAnimations(id);
      validIdsByChar.set(id, new Set(Array.from({ length: loaded.clipCount }, (_, i) => loaded.getClip(i).id)));
    }
    await act(async () => {
      await Promise.resolve();
    });

    const canvases = new Map<string, HTMLCanvasElement>();
    const observedClipIds = new Map<string, string>();

    for (const { id } of PORTRAIT_SPECS) {
      const seatEl = screen.getByTestId(`table-seat-${id}`);
      const canvas = seatEl.querySelector('canvas');
      expect(canvas).not.toBeNull();
      if (!canvas) throw new Error(`Missing concurrent canvas for "${id}"`);
      canvases.set(id, canvas);
    }

    // Step in 20ms increments until every character has started & completed at least one clip
    const completed = new Set<string>();
    for (let elapsed = 0; elapsed <= PORTRAIT_INITIAL_DELAY_MS.max + 10000 && completed.size < PORTRAIT_SPECS.length; elapsed += 20) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
      for (const { id } of PORTRAIT_SPECS) {
        const canvas = canvases.get(id)!;
        const active = canvas.dataset.animation;
        if (active !== undefined) {
          expect(validIdsByChar.get(id)?.has(active)).toBe(true);
          if (!observedClipIds.has(id)) {
            observedClipIds.set(id, active);
          }
        } else if (observedClipIds.has(id) && (framesByCanvas.get(canvas)?.length ?? 0) >= 3) {
          completed.add(id);
        }
      }
    }

    expect(completed.size).toBe(PORTRAIT_SPECS.length);

    for (const { id, svgFile } of PORTRAIT_SPECS) {
      const canvas = canvases.get(id)!;
      const frames = framesByCanvas.get(canvas) ?? [];
      expect(frames.length).toBeGreaterThanOrEqual(3);
      const expectedSvg = parseSvgRgba(svgFile);
      expect(frames[0]).toEqual(expectedSvg);
    }
  });

  it('Scenario 3: plays a multi-cycle shuffle-bag session with zero back-to-back repeats and clean opacity transitions', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { framesByCanvas } = mockCanvas2dContext();

    for (const id of ['haber', 'dealer'] as const) {
      const { container, unmount } = render(<CharacterPortrait id={id} name={id} />);
      const canvas = container.querySelector('canvas')!;
      await flushPortraitLoad(id);

      const playedOrder: string[] = [];
      for (let cycle = 0; cycle < 4; cycle += 1) {
        const maxWait = cycle === 0 ? PORTRAIT_INITIAL_DELAY_MS.max : PORTRAIT_GAP_DELAY_MS.max;
        advanceUntilActive(canvas, maxWait);
        const clipId = canvas.dataset.animation;
        expect(clipId).toBeDefined();
        expect(canvas.style.opacity).toBe('1');
        if (clipId) playedOrder.push(clipId);

        advanceThroughClip(canvas);
        expect(canvas.style.opacity).toBe('0');
        expect(canvas.dataset.animation).toBeUndefined();
      }

      expect(playedOrder).toHaveLength(4);
      for (let i = 1; i < playedOrder.length; i += 1) {
        expect(playedOrder[i]).not.toBe(playedOrder[i - 1]);
      }
      expect((framesByCanvas.get(canvas) ?? []).length).toBeGreaterThanOrEqual(12);
      unmount();
    }
  });

  it('Scenario 4: switches seat IDs dynamically across characters and human Avatar and stays leak-free on unmount', async () => {
    vi.useFakeTimers();
    installMatchMediaMock(false);
    const { putImageData } = mockCanvas2dContext();

    const { container, rerender, unmount } = render(<CharacterPortrait id="haber" name="Haber" />);
    await flushPortraitLoad('haber');
    const haberCanvas = container.querySelector('canvas')!;
    advanceUntilActive(haberCanvas, PORTRAIT_INITIAL_DELAY_MS.max);
    expect(haberCanvas.dataset.animation).toBeDefined();

    // Switch to dealer
    rerender(<CharacterPortrait id="dealer" name="Faxe" />);
    await flushPortraitLoad('dealer');
    const dealerCanvas = container.querySelector('canvas')!;
    advanceUntilActive(dealerCanvas, PORTRAIT_INITIAL_DELAY_MS.max);
    expect(dealerCanvas.dataset.animation).toBeDefined();

    // Switch to human player (Avatar fallback)
    rerender(<CharacterPortrait id="chris" name="Chris" />);
    expect(container.querySelector('.fui-Avatar')).toHaveTextContent('C');
    expect(container.querySelector('canvas')).toBeNull();
    const callsWhileHuman = putImageData.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max);
    });
    expect(putImageData).toHaveBeenCalledTimes(callsWhileHuman);

    // Switch to Ogion and verify active animated playback
    rerender(<CharacterPortrait id="ogion" name="Ogion" />);
    const ogionCanvas = container.querySelector('canvas');
    expect(ogionCanvas).not.toBeNull();
    if (!ogionCanvas) throw new Error('Missing canvas after switching seat to "ogion"');

    await flushPortraitLoad('ogion');
    advanceUntilActive(ogionCanvas, PORTRAIT_INITIAL_DELAY_MS.max);
    expect(ogionCanvas.dataset.animation).toBeDefined();

    const callsBeforeUnmount = putImageData.mock.calls.length;
    unmount();
    act(() => {
      vi.advanceTimersByTime(PORTRAIT_GAP_DELAY_MS.max + 5000);
    });
    expect(putImageData).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('Scenario 5: validates end-to-end asset pipeline consistency from CHARACTERS to SVG, build scripts, compact compiled modules, loaders, and pixel output', async () => {
    const pkg = readPackageJson();
    const animationsScript = pkg.scripts.animations ?? '';

    for (const { builderRelPath, character, compiledRelPath, id, svgFile } of PORTRAIT_SPECS) {
      const svgRgba = parseSvgRgba(svgFile);
      expect(rgbaPixelToHex(svgRgba, 0)).toBe(character.accent.toLowerCase());

      expect(animationsScript).toContain(builderRelPath);
      const builderSource = readFileSync(resolve(builderRelPath), 'utf8');
      expect(builderSource).toContain('portrait-animation-compiler.mjs');

      const compiledAbsPath = resolve(compiledRelPath);
      expect(existsSync(compiledAbsPath)).toBe(true);
      expect(statSync(compiledAbsPath).size).toBeLessThan(MAX_COMPILED_MODULE_BYTES);

      const set = await requireAnimationSet(id);
      const loaded = await requireLoadedAnimations(id);
      expect(loaded.clipCount).toBe(set.clips.length);
      expect(loaded.clipCount).toBe(24);

      const rgba = new Uint8ClampedArray(PIXEL_COUNT * 4);
      const firstClip = loaded.getClip(0);
      blitFrame(firstClip.frames[0].pixels, loaded.paletteRgb, rgba);
      expect(rgba).toEqual(svgRgba);
      blitFrame(firstClip.frames[firstClip.frames.length - 1].pixels, loaded.paletteRgb, rgba);
      expect(rgba).toEqual(svgRgba);
    }
  });
});
