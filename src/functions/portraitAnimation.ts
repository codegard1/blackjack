export type PortraitAnimationClip = {
  readonly id: string;
  readonly data: string;
};

export type PortraitAnimationSet = {
  readonly size: number;
  readonly palette: readonly string[];
  readonly base: string;
  readonly clips: readonly PortraitAnimationClip[];
};

export type DecodedFrame = {
  readonly pixels: Uint8Array;
  readonly durationMs: number;
};

export type DecodedClip = {
  readonly id: string;
  readonly frames: readonly DecodedFrame[];
};

export type LoadedPortraitAnimations = {
  readonly size: number;
  readonly paletteRgb: Uint8Array;
  readonly clipCount: number;
  getClip: (index: number) => DecodedClip;
};

/**
 * Lazy-loaded animation bundles keyed by character id.
 * Each character's clips stay out of the initial bundle until its portrait mounts with motion enabled.
 */
export const PORTRAIT_ANIMATION_LOADERS: Readonly<Record<string, () => Promise<PortraitAnimationSet>>> = {
  haber: () => import('../assets/portraits/haber-animations').then((module) => module.HABER_ANIMATIONS),
  dealer: () => import('../assets/portraits/faxe-animations').then((module) => module.FAXE_ANIMATIONS),
  ogion: () => import('../assets/portraits/ogion-animations').then((module) => module.OGION_ANIMATIONS),
  shevek: () => import('../assets/portraits/shevek-animations').then((module) => module.SHEVEK_ANIMATIONS),
  'genly-ai': () => import('../assets/portraits/genly-ai-animations').then((module) => module.GENLY_AI_ANIMATIONS),
};

const loadedCache = new Map<string, Promise<LoadedPortraitAnimations>>();

function decodeBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Converts `#rrggbb` palette hex strings into packed RGB triples. */
export function parsePaletteRgb(palette: readonly string[]): Uint8Array {
  const rgb = new Uint8Array(palette.length * 3);
  for (let i = 0; i < palette.length; i++) {
    const value = Number.parseInt(palette[i].slice(1), 16);
    rgb[i * 3] = (value >> 16) & 0xff;
    rgb[i * 3 + 1] = (value >> 8) & 0xff;
    rgb[i * 3 + 2] = value & 0xff;
  }
  return rgb;
}

/** Decodes the RLE base frame into `size * size` palette indices. */
export function decodeBaseFrame(set: PortraitAnimationSet): Uint8Array {
  const bytes = decodeBase64(set.base);
  const pixels = new Uint8Array(set.size * set.size);
  let pos = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const colorIdx = bytes[i];
    const runLen = bytes[i + 1];
    pixels.fill(colorIdx, pos, pos + runLen);
    pos += runLen;
  }
  return pixels;
}

/** Decodes one clip's unique delta frames and expands its timeline against `base`. */
export function decodeClip(set: PortraitAnimationSet, base: Uint8Array, clipIndex: number): DecodedClip {
  const clip = set.clips[clipIndex];
  const bytes = decodeBase64(clip.data);
  let offset = 0;

  const uniqueCount = bytes[offset++];
  const uniqueFrames: Uint8Array[] = new Array<Uint8Array>(uniqueCount + 1);
  uniqueFrames[0] = base;

  for (let u = 1; u <= uniqueCount; u++) {
    const header = bytes[offset++];
    const fromPrev = (header >> 7) & 1;
    let runCount = header & 0x7f;
    if (runCount === 127) {
      runCount = (bytes[offset++] << 8) | bytes[offset++];
    }

    const frame = new Uint8Array(fromPrev ? uniqueFrames[u - 1] : base);
    for (let r = 0; r < runCount; r++) {
      const b0 = bytes[offset++];
      const b1 = bytes[offset++];
      const colorIdx = bytes[offset++];
      const pos = (b0 << 2) | (b1 >> 6);
      const len = (b1 & 0x3f) + 1;
      frame.fill(colorIdx, pos, pos + len);
    }
    uniqueFrames[u] = frame;
  }

  const stepCount = bytes[offset++];
  const frames: DecodedFrame[] = new Array<DecodedFrame>(stepCount);
  for (let s = 0; s < stepCount; s++) {
    const frameIdx = bytes[offset++];
    const durationMs = bytes[offset++] * 10;
    frames[s] = { pixels: uniqueFrames[frameIdx], durationMs };
  }

  return { id: clip.id, frames };
}

/** Blits a decoded frame of palette indices into an `ImageData.data` RGBA buffer. */
export function blitFrame(pixels: Uint8Array, paletteRgb: Uint8Array, target: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i++) {
    const rgbOffset = pixels[i] * 3;
    const outOffset = i * 4;
    target[outOffset] = paletteRgb[rgbOffset];
    target[outOffset + 1] = paletteRgb[rgbOffset + 1];
    target[outOffset + 2] = paletteRgb[rgbOffset + 2];
    target[outOffset + 3] = 255;
  }
}

/**
 * Returns a stateful Fisher-Yates shuffle bag that visits every index in `0..count-1`
 * before reshuffling, and never repeats the same index across a reshuffle boundary.
 */
export function createShuffleBag(count: number, rng: () => number = Math.random): () => number {
  if (count <= 1) return () => 0;
  let bag: number[] = [];
  let last = -1;

  return () => {
    if (bag.length === 0) {
      bag = Array.from({ length: count }, (_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (last !== -1 && bag[bag.length - 1] === last) {
        const swapIdx = Math.floor(rng() * (bag.length - 1));
        [bag[bag.length - 1], bag[swapIdx]] = [bag[swapIdx], bag[bag.length - 1]];
      }
    }
    const next = bag.pop()!;
    last = next;
    return next;
  };
}

/** Picks an integer millisecond delay within `[minMs, maxMs]` inclusive. */
export function nextDelayMs(minMs: number, maxMs: number, rng: () => number = Math.random): number {
  return minMs + Math.floor(rng() * (maxMs - minMs + 1));
}

export function hasPortraitAnimations(id: string | undefined): boolean {
  return id !== undefined && Object.hasOwn(PORTRAIT_ANIMATION_LOADERS, id);
}

/** Loads and caches the decoded base frame and lazy per-clip decoder for a character. */
export function loadPortraitAnimations(id: string): Promise<LoadedPortraitAnimations | undefined> {
  if (!Object.hasOwn(PORTRAIT_ANIMATION_LOADERS, id)) return Promise.resolve(undefined);
  let cached = loadedCache.get(id);
  if (!cached) {
    cached = PORTRAIT_ANIMATION_LOADERS[id]().then((set) => {
      const paletteRgb = parsePaletteRgb(set.palette);
      const base = decodeBaseFrame(set);
      const clips = new Array<DecodedClip | undefined>(set.clips.length);
      return {
        size: set.size,
        paletteRgb,
        clipCount: set.clips.length,
        getClip: (index: number) => {
          let clip = clips[index];
          if (!clip) {
            clip = decodeClip(set, base, index);
            clips[index] = clip;
          }
          return clip;
        },
      };
    });
    loadedCache.set(id, cached);
  }
  return cached;
}
