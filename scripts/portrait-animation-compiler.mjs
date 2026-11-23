// Shared compiler and pixel-grid helpers for character portrait idle animations.
// Compiles 24x24 keyframed clips into compact base64 delta-RLE TypeScript modules
// with round-trip pixel verification and optional 6x PNG contact-sheet previews.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, gzipSync } from 'node:zlib';

export const SIZE = 24;
export const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Parses a 24x24 portrait SVG file into a character grid matching `palette`. */
export function loadBaseGridFromSvg(svgPath, palette) {
  const hexToChar = Object.fromEntries(
    Object.keys(palette).map((ch) => [palette[ch].toLowerCase(), ch]),
  );
  const svg = readFileSync(svgPath, 'utf8');
  const grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => '.'));
  const rectRe = /<rect\s+([^>]+?)\/>/g;
  const attrRe = /(\w+)="([^"]+)"/g;
  let match;
  let rectCount = 0;

  while ((match = rectRe.exec(svg)) !== null) {
    rectCount++;
    const attrs = {};
    let attrMatch;
    while ((attrMatch = attrRe.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    const ch = hexToChar[String(attrs.fill || '').toLowerCase()];
    if (!ch) throw new Error(`${svgPath} contains unknown color: ${attrs.fill}`);

    const x = Number(attrs.x ?? 0);
    const y = Number(attrs.y ?? 0);
    const w = Number(attrs.width);
    const h = Number(attrs.height);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        grid[y + dy][x + dx] = ch;
      }
    }
  }
  if (rectCount < 10) throw new Error(`Failed to parse rects from ${svgPath}`);
  return grid;
}

export function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

export function setPx(grid, x, y, ch) {
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    grid[y][x] = ch;
  }
}

export function fillRect(grid, x, y, w, h, ch) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(grid, x + dx, y + dy, ch);
    }
  }
}

/** Overlays a string[] sprite at (x0, y0); spaces (' ') are transparent. */
export function patch(grid, x0, y0, lines) {
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch !== ' ') setPx(grid, x0 + c, y0 + r, ch);
    }
  }
  return grid;
}

/** Shifts the entire grid by (dx, dy), filling newly exposed borders with `bg`. */
export function shiftGrid(grid, dx, dy, bg = '.') {
  const out = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => bg));
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
        out[ny][nx] = grid[y][x];
      }
    }
  }
  return out;
}

export function step(grid, durationMs) {
  return { grid, durationMs };
}

export function loopClip(baseGrid, id, middleSteps, startMs = 90, endMs = 90) {
  return {
    id,
    steps: [
      step(cloneGrid(baseGrid), startMs),
      ...middleSteps,
      step(cloneGrid(baseGrid), endMs),
    ],
  };
}

export function getPreviewDir(argv = process.argv) {
  const previewFlagIdx = argv.indexOf('--preview');
  return previewFlagIdx !== -1 && argv[previewFlagIdx + 1] ? argv[previewFlagIdx + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Binary Delta-RLE Encoder + Round-Trip Verifier
// ---------------------------------------------------------------------------

function gridToIndices(grid, colorIndex) {
  const out = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const ch = grid[y][x];
      if (!(ch in colorIndex)) {
        throw new Error(`Invalid palette character '${ch}' at (${x}, ${y})`);
      }
      out[y * SIZE + x] = colorIndex[ch];
    }
  }
  return out;
}

function encodeBaseRle(baseIndices) {
  const bytes = [];
  let pos = 0;
  while (pos < baseIndices.length) {
    const color = baseIndices[pos];
    let len = 1;
    while (pos + len < baseIndices.length && baseIndices[pos + len] === color && len < 255) {
      len++;
    }
    bytes.push(color, len);
    pos += len;
  }
  return Buffer.from(bytes).toString('base64');
}

function diffRuns(ref, target) {
  const runs = [];
  let pos = 0;
  while (pos < target.length) {
    if (target[pos] === ref[pos]) {
      pos++;
      continue;
    }
    const color = target[pos];
    let len = 1;
    while (
      pos + len < target.length &&
      target[pos + len] !== ref[pos + len] &&
      target[pos + len] === color &&
      len < 64
    ) {
      len++;
    }
    runs.push({ pos, len, color });
    pos += len;
  }
  return runs;
}

function framesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function encodeClip(clip, baseIndices, colorIndex) {
  const stepIndices = clip.steps.map((s) => gridToIndices(s.grid, colorIndex));
  if (stepIndices.length < 3) throw new Error(`${clip.id}: expected at least 3 steps`);
  if (!framesEqual(stepIndices[0], baseIndices)) {
    throw new Error(`${clip.id}: first frame must exactly match base portrait SVG`);
  }
  if (!framesEqual(stepIndices[stepIndices.length - 1], stepIndices[0])) {
    throw new Error(`${clip.id}: end frame must be identical to start frame`);
  }

  let hasChange = false;
  for (let i = 1; i < stepIndices.length; i++) {
    if (framesEqual(stepIndices[i], stepIndices[i - 1])) {
      throw new Error(`${clip.id}: consecutive steps ${i - 1} and ${i} are identical`);
    }
    if (!framesEqual(stepIndices[i], baseIndices)) hasChange = true;
  }
  if (!hasChange) throw new Error(`${clip.id}: clip never changes from base frame`);

  const uniqueFrames = [baseIndices];
  const stepFrameIds = stepIndices.map((indices) => {
    const existingIdx = uniqueFrames.findIndex((u) => framesEqual(u, indices));
    if (existingIdx !== -1) return existingIdx;
    uniqueFrames.push(indices);
    return uniqueFrames.length - 1;
  });

  const uniqueCount = uniqueFrames.length - 1;
  if (uniqueCount > 255) throw new Error(`${clip.id}: too many unique frames (${uniqueCount})`);

  const bytes = [uniqueCount];
  for (let u = 1; u <= uniqueCount; u++) {
    const target = uniqueFrames[u];
    const runsFromBase = diffRuns(baseIndices, target);
    const runsFromPrev = diffRuns(uniqueFrames[u - 1], target);
    const usePrev = runsFromPrev.length < runsFromBase.length ? 1 : 0;
    const runs = usePrev ? runsFromPrev : runsFromBase;

    if (runs.length < 127) {
      bytes.push((usePrev << 7) | runs.length);
    } else {
      bytes.push((usePrev << 7) | 127, (runs.length >> 8) & 0xff, runs.length & 0xff);
    }
    for (const run of runs) {
      bytes.push(run.pos >> 2, ((run.pos & 3) << 6) | (run.len - 1), run.color);
    }
  }

  if (clip.steps.length > 255) throw new Error(`${clip.id}: too many steps`);
  bytes.push(clip.steps.length);
  for (let s = 0; s < clip.steps.length; s++) {
    const ms = clip.steps[s].durationMs;
    if (ms < 10 || ms > 2550 || ms % 10 !== 0) {
      throw new Error(`${clip.id}: step ${s} duration ${ms}ms must be 10..2550 in 10ms ticks`);
    }
    bytes.push(stepFrameIds[s], ms / 10);
  }

  return Buffer.from(bytes).toString('base64');
}

function verifyRoundTrip(baseB64, encodedClips, rawClips, baseIndices, colorIndex) {
  const baseBuf = Buffer.from(baseB64, 'base64');
  const decodedBase = new Uint8Array(SIZE * SIZE);
  let pos = 0;
  for (let i = 0; i < baseBuf.length; i += 2) {
    decodedBase.fill(baseBuf[i], pos, pos + baseBuf[i + 1]);
    pos += baseBuf[i + 1];
  }
  if (!framesEqual(decodedBase, baseIndices)) {
    throw new Error('Base frame RLE round-trip mismatch');
  }

  for (let c = 0; c < encodedClips.length; c++) {
    const bytes = Buffer.from(encodedClips[c].data, 'base64');
    let offset = 0;
    const uniqueCount = bytes[offset++];
    const unique = [decodedBase];
    for (let u = 1; u <= uniqueCount; u++) {
      const hdr = bytes[offset++];
      const fromPrev = (hdr >> 7) & 1;
      let runCount = hdr & 0x7f;
      if (runCount === 127) {
        runCount = (bytes[offset++] << 8) | bytes[offset++];
      }
      const frame = new Uint8Array(fromPrev ? unique[u - 1] : decodedBase);
      for (let r = 0; r < runCount; r++) {
        const b0 = bytes[offset++];
        const b1 = bytes[offset++];
        const color = bytes[offset++];
        const rPos = (b0 << 2) | (b1 >> 6);
        const rLen = (b1 & 0x3f) + 1;
        frame.fill(color, rPos, rPos + rLen);
      }
      unique.push(frame);
    }
    const stepCount = bytes[offset++];
    if (offset + stepCount * 2 !== bytes.length) {
      throw new Error(`${encodedClips[c].id}: trailing or missing bytes during round-trip`);
    }
    const raw = rawClips[c];
    for (let s = 0; s < stepCount; s++) {
      const fIdx = bytes[offset++];
      const dur = bytes[offset++] * 10;
      const expected = gridToIndices(raw.steps[s].grid, colorIndex);
      if (!framesEqual(unique[fIdx], expected) || dur !== raw.steps[s].durationMs) {
        throw new Error(`${encodedClips[c].id}: step ${s} failed round-trip verification`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Zero-dependency PNG Contact Sheet Renderer (--preview <dir>)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

const DIGITS_3X5 = {
  0: ['###', '# #', '# #', '# #', '###'],
  1: [' # ', '## ', ' # ', ' # ', '###'],
  2: ['###', '  #', '###', '#  ', '###'],
  3: ['###', '  #', '###', '  #', '###'],
  4: ['# #', '# #', '###', '  #', '  #'],
  5: ['###', '#  ', '###', '  #', '###'],
  6: ['###', '#  ', '###', '# #', '###'],
  7: ['###', '  #', ' # ', ' # ', ' # '],
  8: ['###', '# #', '###', '# #', '###'],
  9: ['###', '# #', '###', '  #', '###'],
};

function writeContactSheets(clips, outDir, palette, paletteKeys, colorIndex) {
  mkdirSync(outDir, { recursive: true });
  const scale = 6;
  const cell = SIZE * scale;
  const pad = 8;
  const gutter = 42;
  const perSheet = 6;
  const paletteRgb = paletteKeys.map((ch) => {
    const n = Number.parseInt(palette[ch].slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  });

  for (let s = 0; s < clips.length; s += perSheet) {
    const group = clips.slice(s, s + perSheet);
    const maxCols = Math.max(...group.map((c) => c.steps.length));
    const width = gutter + maxCols * (cell + pad) + pad;
    const height = group.length * (cell + pad) + pad;
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      rgba[i * 4] = 28;
      rgba[i * 4 + 1] = 28;
      rgba[i * 4 + 2] = 34;
      rgba[i * 4 + 3] = 255;
    }

    group.forEach((clip, rowIdx) => {
      const clipNum = String(s + rowIdx + 1).padStart(2, '0');
      const gy0 = pad + rowIdx * (cell + pad) + 20;
      for (let d = 0; d < 2; d++) {
        const glyph = DIGITS_3X5[clipNum[d]];
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            if (glyph[r][c] !== '#') continue;
            for (let sy = 0; sy < 3; sy++) {
              for (let sx = 0; sx < 3; sx++) {
                const px = 8 + d * 14 + c * 3 + sx;
                const py = gy0 + r * 3 + sy;
                const off = (py * width + px) * 4;
                rgba[off] = 235;
                rgba[off + 1] = 235;
                rgba[off + 2] = 240;
              }
            }
          }
        }
      }

      clip.steps.forEach((st, colIdx) => {
        const x0 = gutter + pad + colIdx * (cell + pad);
        const y0 = pad + rowIdx * (cell + pad);
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            const [R, G, B] = paletteRgb[colorIndex[st.grid[y][x]]];
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const off = ((y0 + y * scale + sy) * width + (x0 + x * scale + sx)) * 4;
                rgba[off] = R;
                rgba[off + 1] = G;
                rgba[off + 2] = B;
              }
            }
          }
        }
      });
    });

    const file = join(outDir, `sheet-${Math.floor(s / perSheet) + 1}.png`);
    writeFileSync(file, encodePng(width, height, rgba));
    console.log(`wrote preview ${file} (${group.map((c) => c.id).join(', ')})`);
  }
}

export function compileAnimations({
  name,
  scriptRelPath,
  exportName,
  outPath,
  outRelPath,
  palette,
  baseGrid,
  clips,
  previewDir,
}) {
  const paletteKeys = Object.keys(palette);
  const colorIndex = Object.fromEntries(paletteKeys.map((ch, idx) => [ch, idx]));
  const seenIds = new Set();
  for (const c of clips) {
    if (seenIds.has(c.id)) throw new Error(`Duplicate clip id: ${c.id}`);
    seenIds.add(c.id);
  }

  const baseIndices = gridToIndices(baseGrid, colorIndex);
  const baseB64 = encodeBaseRle(baseIndices);
  const encodedClips = clips.map((clip) => ({ id: clip.id, data: encodeClip(clip, baseIndices, colorIndex) }));

  verifyRoundTrip(baseB64, encodedClips, clips, baseIndices, colorIndex);

  const paletteHexes = paletteKeys.map((ch) => palette[ch]);
  const tsOutput = [
    `// Generated by \`npm run animations\` (${scriptRelPath}). Do not edit by hand.`,
    "import type { PortraitAnimationSet } from '../../functions/portraitAnimation';",
    '',
    `export const ${exportName}: PortraitAnimationSet = {`,
    `  size: ${SIZE},`,
    `  palette: ${JSON.stringify(paletteHexes)},`,
    `  base: ${JSON.stringify(baseB64)},`,
    '  clips: [',
    ...encodedClips.map((c) => `    { id: ${JSON.stringify(c.id)}, data: ${JSON.stringify(c.data)} },`),
    '  ],',
    '};',
    '',
  ].join('\n');

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, tsOutput);

  const rawBytes = Buffer.byteLength(tsOutput);
  const gzBytes = gzipSync(tsOutput).length;
  console.log(`wrote ${encodedClips.length} ${name} animations to ${outRelPath} (${rawBytes} B raw, ${gzBytes} B gzipped)`);

  if (previewDir) {
    writeContactSheets(clips, previewDir, palette, paletteKeys, colorIndex);
  }
}
