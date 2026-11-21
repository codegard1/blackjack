import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAXE_ANIMATIONS } from '../assets/portraits/faxe-animations';
import { GENLY_AI_ANIMATIONS } from '../assets/portraits/genly-ai-animations';
import { HABER_ANIMATIONS } from '../assets/portraits/haber-animations';
import { OGION_ANIMATIONS } from '../assets/portraits/ogion-animations';
import { SHEVEK_ANIMATIONS } from '../assets/portraits/shevek-animations';
import {
  PortraitAnimationSet,
  blitFrame,
  createShuffleBag,
  decodeBaseFrame,
  decodeClip,
  hasPortraitAnimations,
  loadPortraitAnimations,
  nextDelayMs,
  parsePaletteRgb,
} from './portraitAnimation';

function parseSvgRgb(svgFileName: string): Uint8Array {
  const svg = readFileSync(resolve('src', 'assets', 'portraits', svgFileName), 'utf8');
  const rgba = new Uint8Array(24 * 24 * 3);
  const rectRe = /<rect\s+([^>]+?)\/>/g;
  const attrRe = /(\w+)="([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = rectRe.exec(svg)) !== null) {
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    const hex = Number.parseInt(attrs.fill.slice(1), 16);
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    const x0 = Number(attrs.x ?? 0);
    const y0 = Number(attrs.y ?? 0);
    const w = Number(attrs.width);
    const h = Number(attrs.height);

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const off = ((y0 + dy) * 24 + (x0 + dx)) * 3;
        rgba[off] = r;
        rgba[off + 1] = g;
        rgba[off + 2] = b;
      }
    }
  }
  return rgba;
}

const CHARACTER_SETS = [
  {
    name: 'Haber',
    svgFile: 'haber.svg',
    set: HABER_ANIMATIONS,
    expectedIds: [
      'wink',
      'tooth-flare',
      'brow-wipe',
      'espresso-sip',
      'check-phone',
      'check-watch',
      'cigarette-puff',
      'stroke-beard',
      'look-around',
      'adjust-tie',
      'nod',
      'fall-asleep',
      'chair-fall',
    ],
  },
  {
    name: 'Faxe',
    svgFile: 'faxe.svg',
    set: FAXE_ANIMATIONS,
    expectedIds: [
      'hair-toss',
      'examine-nails',
      'adjust-headdress',
      'wink',
      'whistle',
    ],
  },
  {
    name: 'Ogion',
    svgFile: 'ogion.svg',
    set: OGION_ANIMATIONS,
    expectedIds: [
      'blink-open',
      'beard-stroke',
      'tea-sip',
      'pipe-puff',
      'horizon-scan',
    ],
  },
  {
    name: 'Shevek',
    svgFile: 'shevek.svg',
    set: SHEVEK_ANIMATIONS,
    expectedIds: [
      'quick-blink',
      'pencil-twirl',
      'coffee-sip',
      'air-math',
      'variance-shrug',
    ],
  },
  {
    name: 'Genly Ai',
    svgFile: 'genly-ai.svg',
    set: GENLY_AI_ANIMATIONS,
    expectedIds: [
      'camera-snap',
      'camera-wipe',
      'parka-shiver',
      'conference-badge',
      'polite-nod',
    ],
  },
] as const;

describe.each(CHARACTER_SETS)('$name portrait animation asset', ({ svgFile, set, expectedIds }) => {
  const paletteRgb = parsePaletteRgb(set.palette);
  const base = decodeBaseFrame(set);

  it(`matches every pixel of ${svgFile} in its decoded base frame`, () => {
    expect(set.size).toBe(24);
    expect(set.palette.every((hex) => /^#[0-9a-f]{6}$/i.test(hex))).toBe(true);

    const decodedRgba = new Uint8ClampedArray(24 * 24 * 4);
    blitFrame(base, paletteRgb, decodedRgba);
    const expectedRgb = parseSvgRgb(svgFile);

    for (let i = 0; i < 24 * 24; i++) {
      expect([decodedRgba[i * 4], decodedRgba[i * 4 + 1], decodedRgba[i * 4 + 2], decodedRgba[i * 4 + 3]]).toEqual([
        expectedRgb[i * 3],
        expectedRgb[i * 3 + 1],
        expectedRgb[i * 3 + 2],
        255,
      ]);
    }
  });

  it('provides 24 distinct animations covering all requested actions', () => {
    expect(set.clips).toHaveLength(24);
    const ids = set.clips.map((clip) => clip.id);
    expect(new Set(ids).size).toBe(24);

    for (const expectedId of expectedIds) {
      expect(ids).toContain(expectedId);
    }
  });

  it.each(set.clips.map((clip, index) => [clip.id, index] as const))(
    '%s starts and ends on the exact base frame, stays in bounds, and animates cleanly',
    (_id, index) => {
      const clip = decodeClip(set, base, index);
      expect(clip.frames.length).toBeGreaterThanOrEqual(3);

      for (const frame of clip.frames) {
        expect(frame.pixels).toHaveLength(576);
        expect(frame.durationMs).toBeGreaterThan(0);
        for (const colorIdx of frame.pixels) {
          expect(colorIdx).toBeLessThan(set.palette.length);
        }
      }

      // Start and end frames must both match the resting portrait pixel-for-pixel
      expect(clip.frames[0].pixels).toEqual(base);
      expect(clip.frames[clip.frames.length - 1].pixels).toEqual(clip.frames[0].pixels);

      // Must actually animate in between and have no redundant back-to-back duplicate frames
      let changedFromBase = false;
      for (let i = 1; i < clip.frames.length; i++) {
        expect(clip.frames[i].pixels).not.toEqual(clip.frames[i - 1].pixels);
        if (!clip.frames[i].pixels.every((px, pos) => px === base[pos])) {
          changedFromBase = true;
        }
      }
      expect(changedFromBase).toBe(true);
    },
  );
});

describe('portraitAnimation runtime helpers', () => {
  it('decodes synthetic clips using extended (>= 127) delta run headers', () => {
    // 1 unique frame from base (fromPrev=0, runCount=127 -> 0x7f followed by uint16 0x00, 0x7f)
    const bytes: number[] = [1, 0x7f, 0x00, 0x7f];
    for (let i = 0; i < 127; i++) {
      // pos = i, len = 1 (encoded 0), colorIdx = 1
      bytes.push(i >> 2, (i & 3) << 6, 1);
    }
    // 3 steps: base (100ms), frame 1 (120ms), base (100ms)
    bytes.push(3, 0, 10, 1, 12, 0, 10);

    const synthetic: PortraitAnimationSet = {
      size: 24,
      palette: ['#000000', '#ffffff'],
      base: Buffer.from([0, 255, 0, 255, 0, 66]).toString('base64'),
      clips: [{ id: 'many-runs', data: Buffer.from(bytes).toString('base64') }],
    };

    const base = decodeBaseFrame(synthetic);
    const clip = decodeClip(synthetic, base, 0);
    expect(clip.frames).toHaveLength(3);
    expect(clip.frames[1].durationMs).toBe(120);
    expect(Array.from(clip.frames[1].pixels.subarray(0, 128))).toEqual([
      ...new Array<number>(127).fill(1),
      0,
    ]);
  });

  it('cycles through every item in a shuffle bag without boundary repeats', () => {
    const bag = createShuffleBag(6);
    const drawn: number[] = [];
    for (let cycle = 0; cycle < 10; cycle++) {
      const cycleItems = Array.from({ length: 6 }, () => bag());
      expect(new Set(cycleItems).size).toBe(6);
      drawn.push(...cycleItems);
    }
    for (let i = 1; i < drawn.length; i++) {
      expect(drawn[i]).not.toBe(drawn[i - 1]);
    }

    // Also verifies boundary swap when RNG constantly returns high values
    const deterministicBag = createShuffleBag(3, () => 0.99);
    const seq = Array.from({ length: 12 }, () => deterministicBag());
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1]);
    }

    // Degenerate single-item bag always returns 0
    const single = createShuffleBag(1);
    expect([single(), single(), single()]).toEqual([0, 0, 0]);
  });

  it('computes randomized delays within inclusive bounds', () => {
    expect(nextDelayMs(1500, 4500, () => 0)).toBe(1500);
    expect(nextDelayMs(1500, 4500, () => 0.999999)).toBe(4500);
    expect(nextDelayMs(1000, 1000)).toBe(1000);
  });

  it('reports animated characters and caches loaded animation sets', async () => {
    for (const id of ['haber', 'dealer', 'ogion', 'shevek', 'genly-ai'] as const) {
      expect(hasPortraitAnimations(id)).toBe(true);
    }
    expect(hasPortraitAnimations('unknown-bot')).toBe(false);
    expect(hasPortraitAnimations(undefined)).toBe(false);

    expect(await loadPortraitAnimations('unknown-bot')).toBeUndefined();

    for (const id of ['haber', 'dealer', 'ogion', 'shevek', 'genly-ai'] as const) {
      const p1 = loadPortraitAnimations(id);
      const p2 = loadPortraitAnimations(id);
      expect(p1).toBe(p2);

      const loaded = await p1;
      expect(loaded).toBeDefined();
      expect(loaded!.clipCount).toBe(24);
      const c1 = loaded!.getClip(0);
      const c2 = loaded!.getClip(0);
      expect(c1).toBe(c2);
    }
  });
});
