// Builds the lazy-loaded pixel-art animations for Haber in
// src/assets/portraits/haber-animations.ts using a compact delta-RLE binary format.
// Run with `npm run animations` after editing.
// Pass `--preview <dir>` to also emit 6x nearest-neighbor PNG contact sheets for inspection.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, gzipSync } from 'node:zlib';

const SIZE = 24;
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const HABER_SVG_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'haber.svg');
const OUT_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'haber-animations.ts');

const PALETTE = {
  '.': '#d98a4e', // background
  k: '#1f1512', // outline / pupils / dark crease
  s: '#f0bf9a', // skin
  S: '#d79d78', // skin shadow (ears / nose / hand shade)
  r: '#8a3a1c', // red-brown hair & beard
  R: '#6b2a12', // dark red-brown (brows & beard shade)
  w: '#f4f1ea', // teeth / shirt / white prop
  j: '#4b4560', // suit jacket
  J: '#33304a', // suit shadow / lapel
  t: '#b3202a', // red tie
  W: '#ffffff', // pure white (lens flare, sclera, cards, steam)
  y: '#ffe066', // bright gold (glint, flame core, watch, coin, sparkle)
  Y: '#d49b27', // gold shadow (watch band, flame edge)
  o: '#f26419', // ember / flame / angry flush
  p: '#d96b6b', // warm rose / open mouth / cheek flush
  c: '#6ec6e8', // cyan (phone screen, sweat drop, shades tint, Zzz)
  C: '#3b7ea1', // deep cyan (sweat shade, screen shadow)
  l: '#bfe6ff', // ice blue (screen highlight, lens shine)
  g: '#a8b2bd', // light grey / silver (lighter, watch face, smoke, comb)
  G: '#646e78', // dark grey / slate (phone body, shades, dark smoke)
  b: '#3b2216', // espresso coffee / dark mouth interior
  B: '#e3c39d', // cream / cigarette filter / crema
  m: '#2f8a4e', // casino green
  M: '#1d5c32', // dark casino green
  T: '#e03c46', // bright red (poker chip / crisp tie highlight)
};

const PALETTE_KEYS = Object.keys(PALETTE);
const COLOR_INDEX = Object.fromEntries(PALETTE_KEYS.map((ch, idx) => [ch, idx]));
const HEX_TO_CHAR = Object.fromEntries(PALETTE_KEYS.map((ch) => [PALETTE[ch].toLowerCase(), ch]));

/** Parses src/assets/portraits/haber.svg so the animation base frame is guaranteed pixel-identical. */
function loadHaberBaseGrid() {
  const svg = readFileSync(HABER_SVG_PATH, 'utf8');
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
    const ch = HEX_TO_CHAR[String(attrs.fill || '').toLowerCase()];
    if (!ch) throw new Error(`haber.svg contains unknown color: ${attrs.fill}`);

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
  if (rectCount < 10) throw new Error(`Failed to parse rects from ${HABER_SVG_PATH}`);
  return grid;
}

const BASE_GRID = loadHaberBaseGrid();

// ---------------------------------------------------------------------------
// Pixel grid composition helpers
// ---------------------------------------------------------------------------

function cloneGrid(grid = BASE_GRID) {
  return grid.map((row) => [...row]);
}

function setPx(grid, x, y, ch) {
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    grid[y][x] = ch;
  }
}

function fillRect(grid, x, y, w, h, ch) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(grid, x + dx, y + dy, ch);
    }
  }
}

/** Overlays a string[] sprite at (x0, y0); spaces (' ') are transparent. */
function patch(grid, x0, y0, lines) {
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch !== ' ') setPx(grid, x0 + c, y0 + r, ch);
    }
  }
  return grid;
}

/** Shifts the entire grid by (dx, dy), filling newly exposed borders with background '.'. */
function shiftGrid(grid, dx, dy, bg = '.') {
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

function isHeadPixel(x, y) {
  if (y <= 16) return true;
  if (y >= 17 && y <= 18 && x >= 9 && x <= 14) return true;
  return false;
}

/** Moves Haber's head & ears by (dx, dy) while keeping his suit, collar, and tie anchored. */
function withHeadOffset(dx, dy) {
  const out = cloneGrid(BASE_GRID);
  if (dx === 0 && dy === 0) return out;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isHeadPixel(x, y)) out[y][x] = '.';
    }
  }
  // Collar and tie top uncovered when the head lifts or shifts sideways
  patch(out, 9, 17, ['kkkkkk', 'wwttww']);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isHeadPixel(x, y) && BASE_GRID[y][x] !== '.') {
        setPx(out, x + dx, y + dy, BASE_GRID[y][x]);
      }
    }
  }
  return out;
}

/** Repositions eyebrows vertically from their base row (y=7). */
function setBrows(grid, leftDy = 0, rightDy = 0) {
  fillRect(grid, 8, 7, 3, 1, 's');
  fillRect(grid, 13, 7, 3, 1, 's');
  fillRect(grid, 8, 7 + leftDy, 3, 1, 'R');
  fillRect(grid, 13, 7 + rightDy, 3, 1, 'R');
  return grid;
}

/** Shifts eye gaze cleanly inside Haber's eye sockets. */
function setGaze(grid, mode) {
  if (mode === 'left') {
    patch(grid, 8, 8, ['kW']);
    patch(grid, 13, 8, ['kW']);
  } else if (mode === 'right') {
    patch(grid, 9, 8, ['Wk']);
    patch(grid, 14, 8, ['Wk']);
  } else if (mode === 'down') {
    patch(grid, 9, 8, ['W', 'k']);
    patch(grid, 14, 8, ['W', 'k']);
  } else if (mode === 'down-right') {
    patch(grid, 9, 8, ['W', 'k']);
    patch(grid, 14, 8, ['W', 'k']);
  } else if (mode === 'up-right') {
    patch(grid, 9, 8, ['Wk']);
    patch(grid, 14, 8, ['Wk']);
  } else if (mode === 'wide') {
    patch(grid, 8, 8, ['WkW']);
    patch(grid, 13, 8, ['WkW']);
  } else if (mode === 'half') {
    setPx(grid, 9, 8, 'S');
    setPx(grid, 14, 8, 'S');
  } else if (mode === 'shut') {
    patch(grid, 8, 8, ['sks']);
    patch(grid, 13, 8, ['sks']);
    patch(grid, 8, 7, ['sss']);
    patch(grid, 13, 7, ['sss']);
    patch(grid, 8, 8, ['RkR']);
    patch(grid, 13, 8, ['RkR']);
  }
  return grid;
}

/** Applies a brighter, wider grin. */
function brightGrin(grid, wider = false) {
  fillRect(grid, 9, 12, 6, 1, 'W');
  if (wider) {
    setPx(grid, 8, 12, 'w');
    setPx(grid, 15, 12, 'w');
    setPx(grid, 7, 12, 'k');
    setPx(grid, 16, 12, 'k');
  }
  return grid;
}

function step(grid, durationMs) {
  return { grid, durationMs };
}

function loopClip(id, middleSteps, startMs = 90, endMs = 90) {
  return {
    id,
    steps: [
      step(cloneGrid(), startMs),
      ...middleSteps,
      step(cloneGrid(), endMs),
    ],
  };
}

// ---------------------------------------------------------------------------
// 24 Loopable Haber Animations
// ---------------------------------------------------------------------------

function buildClips() {
  const clips = [];

  // 1. Wink
  {
    const half = cloneGrid();
    setPx(half, 14, 8, 'S');

    const wink = cloneGrid();
    setBrows(wink, -1, 1); // left brow arches up, right brow dips into wink
    patch(wink, 13, 8, ['RkR']); // tight squinted right eye
    setPx(wink, 15, 11, 'k'); // right smirk corner lifts
    setPx(wink, 15, 12, 'w');

    clips.push(loopClip('wink', [
      step(half, 70),
      step(wink, 380),
      step(half, 70),
    ]));
  }

  // 2. Smile, with a lens flare coming from his white teeth
  {
    const smug = brightGrin(setBrows(cloneGrid(), -1, -1));

    const flare1 = brightGrin(setBrows(cloneGrid(), -1, -1));
    patch(flare1, 13, 11, [
      ' y ',
      'yWy',
      ' y ',
    ]);

    const flare2 = brightGrin(setBrows(cloneGrid(), -1, -1));
    patch(flare2, 11, 9, [
      '   y   ',
      '   y   ',
      '  yWy  ',
      'yyWWWy ',
      '  yWy  ',
      '   y   ',
      '   y   ',
    ]);
    setPx(flare2, 17, 12, 'y');

    const flare3 = brightGrin(setBrows(cloneGrid(), -1, -1));
    patch(flare3, 11, 9, [
      'y     y',
      ' y y y ',
      '  WWW  ',
      ' yWWWy ',
      '  WWW  ',
      ' y y y ',
      'y     y',
    ]);

    clips.push(loopClip('tooth-flare', [
      step(smug, 150),
      step(flare1, 80),
      step(flare2, 180),
      step(flare3, 120),
      step(flare1, 80),
      step(smug, 130),
    ]));
  }

  // 3. Wipe his brow with a pocket square
  {
    const sweat = setBrows(cloneGrid(), -1, -1);
    patch(sweat, 16, 6, ['c', 'C']);

    const raise = setBrows(cloneGrid(), -1, -1);
    patch(raise, 16, 6, ['c', 'C']);
    patch(raise, 16, 14, [
      ' kWWk ',
      'kWWWWk',
      'kWWssk',
      ' kSSjk',
      ' kjjjk',
    ]);

    const wipeRight = cloneGrid();
    setGaze(wipeRight, 'half');
    patch(wipeRight, 11, 3, [
      ' kWWWk ',
      'kWWWWwk',
      'kWWwwsk',
      ' kkkkSk',
      '   kSSk',
      '   kjjk',
    ]);

    const wipeLeft = cloneGrid();
    setGaze(wipeLeft, 'half');
    patch(wipeLeft, 7, 3, [
      ' kWWWk ',
      'kWWWWwk',
      'kWWwwsk',
      ' kkkkSk',
      '   kSSk',
      '   kjjk',
    ]);

    const lower = cloneGrid();
    patch(lower, 16, 15, [
      ' kWWk ',
      'kWWWWk',
      'kWWssk',
      ' kSSjk',
    ]);

    clips.push(loopClip('brow-wipe', [
      step(sweat, 240),
      step(raise, 110),
      step(wipeRight, 150),
      step(wipeLeft, 180),
      step(wipeRight, 140),
      step(lower, 120),
    ]));
  }

  // 4. Take a sip of espresso
  {
    const liftLow = setGaze(cloneGrid(), 'down');
    patch(liftLow, 15, 16, [
      ' kbbk ',
      'kWWWWk',
      'kWWWWk',
      ' kWWk ',
      'kssSjk',
      ' kjjjk',
    ]);

    const liftMid = setGaze(cloneGrid(), 'down');
    setPx(liftMid, 14, 11, 'W');
    setPx(liftMid, 13, 10, 'w');
    patch(liftMid, 12, 13, [
      'kBBBBk',
      'kWWWWkk',
      'kWWWWk ',
      ' kWWk  ',
      ' kssk  ',
      ' kjjk  ',
    ]);

    const sip = setBrows(cloneGrid(), -1, -1);
    setGaze(sip, 'half');
    patch(sip, 10, 11, [
      'kbbbbk',
      'kWWWWkk',
      'kWWWWk ',
      ' kWWk  ',
      ' kssk  ',
      ' kjjk  ',
    ]);

    const perk = brightGrin(setBrows(cloneGrid(), -1, -1));
    patch(perk, 14, 15, [
      ' kbbk ',
      'kWWWWk',
      ' kWWk ',
      'kssSjk',
      ' kjjjk',
    ]);

    const lower = brightGrin(cloneGrid());
    patch(lower, 16, 18, [
      ' kbbk ',
      'kWWWWk',
      ' kWWk ',
      ' kssjk',
    ]);

    clips.push(loopClip('espresso-sip', [
      step(liftLow, 150),
      step(liftMid, 160),
      step(sip, 380),
      step(perk, 220),
      step(lower, 130),
    ]));
  }

  // 5. Look at his phone
  {
    const phoneBodyA = [
      ' kkkk ',
      'kGllGk',
      'kGccGk',
      'kGcWGk',
      'kGCCGk',
      'kGGssk',
      ' kSSjk',
      ' kjjjk',
    ];
    const phoneBodyB = [
      ' kkkk ',
      'kGWWGk',
      'kGllGk',
      'kGccGk',
      'kGCcGk',
      'kGGssk',
      ' kSSjk',
      ' kjjjk',
    ];

    const raise = setGaze(cloneGrid(), 'down');
    patch(raise, 15, 16, phoneBodyA);

    const read1 = setGaze(cloneGrid(), 'down');
    patch(read1, 14, 13, phoneBodyA);

    const scroll = setBrows(setGaze(cloneGrid(), 'down'), -1, -1);
    patch(scroll, 14, 13, phoneBodyB);

    const read2 = setBrows(setGaze(cloneGrid(), 'down'), -1, -1);
    patch(read2, 14, 13, phoneBodyA);

    clips.push(loopClip('check-phone', [
      step(raise, 130),
      step(read1, 380),
      step(scroll, 320),
      step(read2, 260),
      step(raise, 130),
    ]));
  }

  // 6. Look at his watch
  {
    const armLow = setGaze(cloneGrid(), 'down');
    patch(armLow, 3, 17, [
      '    kkk   ',
      '   kYYyk  ',
      '  kwyWWwk ',
      ' kjjYYyssk',
      'kjjjkkSSk ',
    ]);

    const check1 = setGaze(cloneGrid(), 'down');
    fillRect(check1, 9, 12, 6, 2, 'r');
    fillRect(check1, 10, 12, 4, 1, 'k'); // tight impatient flat mouth
    patch(check1, 4, 14, [
      '    kkkk   ',
      '   kYYYYk  ',
      '  kwyWWgsk ',
      ' kjjyWgssSk',
      'kjjJkYYYYk ',
      'kjjjkkkk   ',
    ]);

    const glint = cloneGrid(check1);
    patch(glint, 8, 15, [
      'yW ',
      ' WW',
    ]);

    clips.push(loopClip('check-watch', [
      step(armLow, 140),
      step(check1, 380),
      step(glint, 240),
      step(check1, 200),
      step(armLow, 140),
    ]));
  }

  // 7. Light a cigarette and take a single puff
  {
    const cigReady = cloneGrid();
    patch(cigReady, 13, 12, ['kBBwwwGk']); // cigarette in corner of mouth
    patch(cigReady, 17, 16, [
      ' kggk ',
      'kGGGGk',
      'kGGssk',
      ' kSSjk',
      ' kjjjk',
    ]);

    const lighting = setGaze(cloneGrid(), 'down-right');
    patch(lighting, 13, 12, ['kBBwwwoy']); // tip hits flame
    patch(lighting, 18, 13, [
      ' yo ',
      'yWoy',
      'kggk',
      'kGGk',
      'kssk',
      'kjjk',
    ]);

    const inhale = setGaze(cloneGrid(), 'half');
    patch(inhale, 13, 12, ['kBBwwwyo']); // bright glowing ember

    const exhale1 = cloneGrid();
    patch(exhale1, 12, 12, ['bk']); // small puff mouth
    patch(exhale1, 14, 10, [
      ' wW ',
      'Www ',
    ]);
    patch(exhale1, 16, 16, [
      'kwwwBo',
      ' kssSk',
      ' kjjjk',
    ]);

    const exhale2 = cloneGrid();
    patch(exhale2, 16, 7, [
      ' gWW ',
      'wWWw ',
      ' wg  ',
    ]);
    patch(exhale2, 17, 18, [
      'kwwBo',
      ' kssk',
      ' kjjk',
    ]);

    const exhale3 = cloneGrid();
    patch(exhale3, 18, 4, [
      ' Ggg ',
      'gwWG ',
      ' gG  ',
    ]);

    const exhale4 = cloneGrid();
    patch(exhale4, 20, 2, [
      ' Gg ',
      ' g  ',
    ]);

    clips.push(loopClip('cigarette-puff', [
      step(cigReady, 180),
      step(lighting, 280),
      step(inhale, 320),
      step(exhale1, 180),
      step(exhale2, 180),
      step(exhale3, 180),
      step(exhale4, 150),
    ]));
  }

  // 8. Stroke his beard thoughtfully
  {
    const think = setBrows(setGaze(cloneGrid(), 'left'), -1, 0);

    const raise = cloneGrid(think);
    patch(raise, 13, 16, [
      ' kssk ',
      'kssSSk',
      ' kSSjk',
      ' kjjjk',
    ]);

    const strokeTop = cloneGrid(think);
    patch(strokeTop, 10, 14, [
      ' ksssk ',
      'kssSSSk',
      ' kSSSjk',
      '  kjjjk',
    ]);

    const strokeBot = cloneGrid(think);
    setPx(strokeBot, 11, 15, 'R');
    setPx(strokeBot, 12, 15, 'R');
    patch(strokeBot, 10, 16, [
      ' ksssk ',
      'kssSSSk',
      ' kSSSjk',
      '  kjjjk',
    ]);

    const strokeBotBlink = setGaze(cloneGrid(strokeBot), 'half');

    clips.push(loopClip('stroke-beard', [
      step(raise, 140),
      step(strokeTop, 220),
      step(strokeBot, 240),
      step(strokeTop, 200),
      step(strokeBotBlink, 240),
      step(raise, 140),
    ]));
  }

  // 9. Look around nervously
  {
    const lookLeft = setBrows(setGaze(withHeadOffset(-1, 0), 'left'), -1, -1);
    setPx(lookLeft, 16, 6, 'c');

    const lookRight = setBrows(setGaze(withHeadOffset(1, 0), 'right'), -1, -1);
    setPx(lookRight, 18, 6, 'c');

    const lookLeft2 = setBrows(setGaze(withHeadOffset(-1, 0), 'left'), -1, -1);
    setPx(lookLeft2, 16, 6, 'c');

    const centerBlink = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('look-around', [
      step(lookLeft, 280),
      step(lookRight, 320),
      step(lookLeft2, 240),
      step(centerBlink, 110),
    ]));
  }

  // 10. Adjust his tie
  {
    const crooked = cloneGrid();
    // Tie shifts 1px left at bottom before he straightens it
    patch(crooked, 10, 22, ['ttw', 'Jtt']);

    const grab = cloneGrid(crooked);
    patch(grab, 11, 18, [
      ' ksssk ',
      'kssSSSk',
      ' kSSjjk',
      '  kjjjk',
    ]);

    const tugDown = cloneGrid();
    patch(tugDown, 11, 20, ['TT']); // crisp red highlight
    patch(tugDown, 11, 19, [
      ' ksssk ',
      'kssSSSk',
      ' kSSjjk',
      '  kjjjk',
    ]);

    const snugUp = withHeadOffset(0, -1); // proud chin-lift!
    patch(snugUp, 11, 19, ['TT', 'TT']);
    patch(snugUp, 11, 18, [
      ' ksssk ',
      'kssSSSk',
      ' kSSjjk',
      '  kjjjk',
    ]);

    const release = cloneGrid();
    patch(release, 11, 19, ['TT', 'TT']);
    patch(release, 14, 19, [
      ' kssk ',
      'kssSSk',
      ' kSSjk',
    ]);

    clips.push(loopClip('adjust-tie', [
      step(crooked, 150),
      step(grab, 180),
      step(tugDown, 180),
      step(snugUp, 260),
      step(release, 160),
    ]));
  }

  // 11. Nod
  {
    const down1 = withHeadOffset(0, 1);
    const down2 = setGaze(withHeadOffset(0, 2), 'half');
    // Shift eyes relative to shifted head for down2: eyes were at y=8+2=10
    setPx(down2, 9, 8, BASE_GRID[6][9]);
    setPx(down2, 14, 8, BASE_GRID[6][14]);
    setPx(down2, 9, 10, 'S');
    setPx(down2, 14, 10, 'S');

    clips.push(loopClip('nod', [
      step(down1, 100),
      step(down2, 150),
      step(down1, 90),
      step(cloneGrid(), 110),
      step(down1, 130),
    ]));
  }

  // 12. Fall asleep momentarily
  {
    const drowsy = setGaze(cloneGrid(), 'half');
    setBrows(drowsy, 1, 1);

    const doze1 = withHeadOffset(0, 1);
    patch(doze1, 8, 8, ['sss', 'RkR']); // eyes closed at shifted y=9
    patch(doze1, 13, 8, ['sss', 'RkR']);
    fillRect(doze1, 9, 13, 6, 2, 'r');
    patch(doze1, 11, 13, ['kk']); // calm small mouth

    const doze2 = withHeadOffset(0, 2);
    patch(doze2, 8, 9, ['sss', 'RkR']);
    patch(doze2, 13, 9, ['sss', 'RkR']);
    fillRect(doze2, 9, 14, 6, 2, 'r');
    patch(doze2, 11, 14, ['kk']);
    patch(doze2, 19, 3, [
      'ccc',
      ' c ',
      'ccc',
    ]);

    const doze3 = withHeadOffset(0, 2);
    patch(doze3, 8, 9, ['sss', 'RkR']);
    patch(doze3, 13, 9, ['sss', 'RkR']);
    fillRect(doze3, 9, 14, 6, 2, 'r');
    patch(doze3, 11, 14, ['kk']);
    patch(doze3, 18, 1, [
      'WWWW',
      '  W ',
      ' W  ',
      'WWWW',
    ]);

    const jolt = withHeadOffset(0, -1);
    patch(jolt, 8, 7, ['WkW']);
    patch(jolt, 13, 7, ['WkW']);
    fillRect(jolt, 8, 5, 3, 1, 'R');
    fillRect(jolt, 13, 5, 3, 1, 'R');
    fillRect(jolt, 8, 6, 3, 1, 's');
    fillRect(jolt, 13, 6, 3, 1, 's');
    patch(jolt, 9, 11, ['rkbbkr', 'rkkkkr']); // clean startled O mouth

    const settleBlink = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('fall-asleep', [
      step(drowsy, 200),
      step(doze1, 280),
      step(doze2, 340),
      step(doze3, 380),
      step(jolt, 280),
      step(settleBlink, 120),
    ]));
  }

  // 13. Fall backwards as if his chair had broken underneath him, then walk back into frame
  {
    const startle = setGaze(cloneGrid(), 'wide');
    setBrows(startle, -1, -1);
    patch(startle, 9, 12, ['rkbbkr', 'rkkkkr']); // clean startled O mouth
    // Flailing hands thrown up at sides
    patch(startle, 0, 12, [
      ' ksk ',
      'ksssk',
      'kSSsk',
      ' kjjk',
    ]);
    patch(startle, 19, 12, [
      ' ksk ',
      'ksssk',
      'kSSsk',
      ' kjjk',
    ]);

    const drop1 = shiftGrid(startle, 0, 4);
    const drop2 = shiftGrid(startle, 0, 10);

    const drop3 = shiftGrid(cloneGrid(), 0, 17);
    // Impact dust puffs kicking up at left & right bottom corners
    patch(drop3, 1, 21, [' w ', 'Wwg']);
    patch(drop3, 20, 21, [' w ', 'gwW']);
    // Fingertips barely peeking at bottom
    patch(drop3, 4, 22, ['ksk', 'sss']);
    patch(drop3, 17, 22, ['ksk', 'sss']);

    const dustSettle = shiftGrid(cloneGrid(), 0, 24); // empty orange
    patch(dustSettle, 1, 19, [' g ', 'wWg']);
    patch(dustSettle, 20, 19, [' g ', 'gWw']);

    const empty = shiftGrid(cloneGrid(), 0, 24);

    // Walks back in from the left with a buoyant 1px stride bob
    const walk1 = shiftGrid(BASE_GRID, -17, -1);
    const walk2 = shiftGrid(BASE_GRID, -12, 0);
    const walk3 = shiftGrid(BASE_GRID, -7, -1);
    const walk4 = shiftGrid(BASE_GRID, -3, 0);
    const walk5 = shiftGrid(BASE_GRID, -1, -1);

    clips.push(loopClip('chair-fall', [
      step(startle, 180),
      step(drop1, 100),
      step(drop2, 90),
      step(drop3, 120),
      step(dustSettle, 200),
      step(empty, 260),
      step(walk1, 110),
      step(walk2, 110),
      step(walk3, 110),
      step(walk4, 110),
      step(walk5, 100),
    ]));
  }

  // 14. Deal-with-it sunglasses drop
  {
    const shades = [
      'kkkkkkkkkkkk',
      'kCGGkkkkGGCk',
      ' kkk    kkk ',
    ];

    const dropTop = patch(cloneGrid(), 6, 1, shades);
    const dropMid = patch(cloneGrid(), 6, 4, shades);
    const landed = patch(cloneGrid(), 6, 8, shades);

    const glint1 = patch(cloneGrid(), 6, 8, [
      'kkkkkkkkkkkk',
      'kWClkkkkGGCk',
      ' kkk    kkk ',
    ]);

    const glint2 = patch(withHeadOffset(0, -1), 6, 7, [
      'kkkkkkkkkkkk',
      'kCGGkkkkWClk',
      ' kkk    kkk ',
    ]);

    clips.push(loopClip('sunglasses-drop', [
      step(dropTop, 100),
      step(dropMid, 100),
      step(landed, 180),
      step(glint1, 160),
      step(glint2, 260),
      step(dropMid, 100),
      step(dropTop, 100),
    ]));
  }

  // 15. Mischievous eyebrow waggle
  {
    const up = brightGrin(setBrows(cloneGrid(), -1, -1));
    const down = brightGrin(cloneGrid());

    clips.push(loopClip('eyebrow-waggle', [
      step(up, 120),
      step(down, 90),
      step(up, 120),
      step(down, 90),
      step(up, 120),
    ]));
  }

  // 16. Flip a poker chip
  {
    const ready = setGaze(cloneGrid(), 'right');
    patch(ready, 17, 15, [
      ' kTk ',
      'kTwTk',
      ' kTk ',
      'ksssk',
      ' kjjk',
    ]);

    const tossUp = setGaze(cloneGrid(), 'up-right');
    patch(tossUp, 18, 9, [
      ' kTk ',
      'kTwTk',
      ' kTk ',
    ]);
    patch(tossUp, 17, 17, [
      ' kssk',
      ' kjjk',
    ]);

    const peakEdge = setBrows(setGaze(cloneGrid(), 'up-right'), -1, -1);
    patch(peakEdge, 18, 4, [
      'kTyTk',
    ]);
    patch(peakEdge, 17, 17, [
      ' kssk',
      ' kjjk',
    ]);

    const spinFlat = setGaze(cloneGrid(), 'up-right');
    patch(spinFlat, 18, 6, [
      ' kwk ',
      'kwTwk',
      ' kwk ',
    ]);
    patch(spinFlat, 17, 17, [
      ' kssk',
      ' kjjk',
    ]);

    const dropEdge = setGaze(cloneGrid(), 'right');
    patch(dropEdge, 18, 11, [
      'kTyTk',
    ]);
    patch(dropEdge, 17, 16, [
      ' kssk',
      ' kjjk',
    ]);

    const caught = brightGrin(cloneGrid());
    patch(caught, 17, 15, [
      'y y  ',
      ' kTk ',
      'kTwTk',
      ' ksssk',
      '  kjjk',
    ]);

    clips.push(loopClip('flip-chip', [
      step(ready, 140),
      step(tossUp, 110),
      step(peakEdge, 120),
      step(spinFlat, 110),
      step(dropEdge, 110),
      step(caught, 260),
      step(ready, 120),
    ]));
  }

  // 17. Dollar / casino-green eyes
  {
    const gleamA = brightGrin(setBrows(cloneGrid(), -1, -1), true);
    patch(gleamA, 8, 7, [
      'smms',
      'smys',
    ]);
    patch(gleamA, 13, 7, [
      'smms',
      'syMs',
    ]);
    // Keep brows high at y=6
    fillRect(gleamA, 8, 6, 3, 1, 'R');
    fillRect(gleamA, 13, 6, 3, 1, 'R');

    const gleamB = cloneGrid(gleamA);
    patch(gleamB, 2, 4, [' y ', 'yWy', ' y ']);
    patch(gleamB, 20, 4, [' y ', 'yWy', ' y ']);
    patch(gleamB, 9, 8, ['ym']);
    patch(gleamB, 14, 8, ['my']);

    const gleamC = cloneGrid(gleamA);
    patch(gleamC, 1, 2, ['W']);
    patch(gleamC, 21, 3, ['W']);
    patch(gleamC, 3, 6, ['y']);
    patch(gleamC, 19, 7, ['y']);

    const blink = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('dollar-eyes', [
      step(gleamA, 160),
      step(gleamB, 280),
      step(gleamC, 240),
      step(blink, 100),
    ]));
  }

  // 18. Hearty maniac belly laugh
  {
    const makeLaughFrame = (dy) => {
      const f = withHeadOffset(0, dy);
      // Happy upward ^ ^ squinted eyes & wide open mouth
      const ey = 8 + dy;
      const my = 12 + dy;
      fillRect(f, 8, ey - 1, 3, 1, 's');
      fillRect(f, 13, ey - 1, 3, 1, 's');
      patch(f, 8, ey - 1, [' k ', 'ksk']);
      patch(f, 13, ey - 1, [' k ', 'ksk']);
      setPx(f, 7, ey + 1, 'p'); // rosy laughing cheeks
      setPx(f, 16, ey + 1, 'p');
      patch(f, 8, my, [
        'kWWWWWWk',
        'kbbbbbbk',
        ' kppppk ',
        '  kkkk  ',
      ]);
      return f;
    };

    const laughUp = makeLaughFrame(-1);
    const laughDown = makeLaughFrame(1);
    const beam = brightGrin(cloneGrid());

    clips.push(loopClip('hearty-laugh', [
      step(laughUp, 140),
      step(laughDown, 140),
      step(laughUp, 140),
      step(laughDown, 140),
      step(laughUp, 140),
      step(beam, 160),
    ]));
  }

  // 19. Comedic double-take
  {
    const glance = setGaze(cloneGrid(), 'right');
    const shock = setGaze(withHeadOffset(1, 0), 'wide');
    // Move brows high on shifted head (x+1)
    fillRect(shock, 9, 7, 3, 1, 's');
    fillRect(shock, 14, 7, 3, 1, 's');
    fillRect(shock, 9, 6, 3, 1, 'R');
    fillRect(shock, 14, 6, 3, 1, 'R');
    patch(shock, 9, 8, ['WkW']);
    patch(shock, 14, 8, ['WkW']);
    patch(shock, 10, 12, ['rkbbkr', 'rkkkkr']); // clean slack-jawed surprise

    const shockBlink = cloneGrid(shock);
    patch(shockBlink, 9, 8, ['sSs']);
    patch(shockBlink, 14, 8, ['sSs']);

    clips.push(loopClip('double-take', [
      step(glance, 200),
      step(cloneGrid(), 140),
      step(shock, 400),
      step(shockBlink, 110),
    ]));
  }

  // 20. Skeptical head shake "no"
  {
    const makeShake = (dx) => {
      const f = withHeadOffset(dx, 0);
      // Knit brows at y=6..7 without touching eyes, and crisp 1px flat mouth
      fillRect(f, 8 + dx, 6, 3, 2, 's');
      fillRect(f, 13 + dx, 6, 3, 2, 's');
      patch(f, 8 + dx, 6, ['RR ', '  R']);
      patch(f, 13 + dx, 6, [' RR', 'R  ']);
      fillRect(f, 9 + dx, 12, 6, 2, 'r');
      fillRect(f, 10 + dx, 12, 4, 1, 'k');
      return f;
    };

    const center = makeShake(0);
    const left = makeShake(-1);
    const right = makeShake(1);

    clips.push(loopClip('head-shake', [
      step(center, 140),
      step(left, 180),
      step(center, 100),
      step(right, 180),
      step(center, 100),
      step(left, 160),
    ]));
  }

  // 21. Comb his hair
  {
    const combSprite = [
      'kkkkk',
      'ggggg',
      'k k k',
    ];

    const lift = cloneGrid();
    patch(lift, 1, 10, combSprite);
    patch(lift, 2, 13, ['kssk', 'kjjk']);

    const stroke1 = cloneGrid();
    patch(stroke1, 5, 2, combSprite);
    patch(stroke1, 4, 5, ['kssk', 'kSSk']);

    const stroke2 = cloneGrid();
    patch(stroke2, 9, 1, combSprite);
    patch(stroke2, 8, 4, ['kssk']);
    setPx(stroke2, 7, 3, 'W'); // hair sheen!

    const stroke3 = cloneGrid();
    patch(stroke3, 13, 2, combSprite);
    patch(stroke3, 16, 4, ['kssk']);
    setPx(stroke3, 11, 3, 'W');
    setPx(stroke3, 12, 3, 'W');

    const lower = brightGrin(cloneGrid());
    patch(lower, 16, 8, combSprite);
    patch(lower, 17, 11, ['kssk', 'kjjk']);
    setPx(lower, 14, 3, 'W');

    clips.push(loopClip('comb-hair', [
      step(lift, 140),
      step(stroke1, 160),
      step(stroke2, 160),
      step(stroke3, 160),
      step(lower, 150),
    ]));
  }

  // 22. Double finger guns + wink
  {
    const leftGun = [
      '   ksk ',
      '  ksssk',
      ' ksssWk',
      'kjjSSk ',
      'kjjjk  ',
    ];
    const rightGun = [
      ' ksk   ',
      'ksssk  ',
      'kWsssk ',
      ' kSSjjk',
      '  kjjjk',
    ];

    const aim = brightGrin(cloneGrid());
    setBrows(aim, -1, 1);
    patch(aim, 13, 8, ['RkR']); // wink!
    patch(aim, 1, 16, leftGun);
    patch(aim, 16, 16, rightGun);

    const snap = cloneGrid(aim);
    patch(snap, 1, 15, leftGun);
    patch(snap, 16, 15, rightGun);
    // Gold click sparks!
    patch(snap, 7, 15, ['y', 'W']);
    patch(snap, 16, 15, ['y', 'W']);

    clips.push(loopClip('finger-guns', [
      step(aim, 180),
      step(snap, 160),
      step(aim, 140),
      step(snap, 160),
      step(aim, 150),
    ]));
  }

  // 23. Steam out of ears ("on tilt")
  {
    const baseAngry = cloneGrid();
    // Flushed cheeks + angry slanting brows + clenched teeth
    patch(baseAngry, 7, 9, ['oo']);
    patch(baseAngry, 15, 9, ['oo']);
    patch(baseAngry, 7, 10, ['pp']);
    patch(baseAngry, 15, 10, ['pp']);
    fillRect(baseAngry, 8, 7, 8, 1, 's');
    patch(baseAngry, 8, 6, ['R  ', ' RR']);
    patch(baseAngry, 13, 6, ['  R', 'RR ']);
    fillRect(baseAngry, 9, 12, 6, 1, 'W');

    const steam1 = cloneGrid(baseAngry);
    patch(steam1, 2, 7, ['wW', 'WW']);
    patch(steam1, 20, 7, ['Ww', 'WW']);

    const steam2 = cloneGrid(baseAngry);
    patch(steam2, 0, 4, [' gW ', 'wWW ', ' WWw']);
    patch(steam2, 20, 4, [' Wg ', ' WWw', 'wWW ']);

    const steam3 = cloneGrid(baseAngry);
    patch(steam3, 1, 2, ['Gg ', 'wW ', ' WW']);
    patch(steam3, 20, 2, [' gG', ' Ww', 'WW ']);
    patch(steam3, 2, 7, ['wW']);
    patch(steam3, 20, 7, ['Ww']);

    const steamFade = cloneGrid();
    patch(steamFade, 1, 1, [' G ', 'g  ']);
    patch(steamFade, 20, 1, [' G ', '  g']);

    clips.push(loopClip('steam-tilt', [
      step(baseAngry, 200),
      step(steam1, 160),
      step(steam2, 200),
      step(steam3, 200),
      step(steamFade, 160),
    ]));
  }

  // 24. Peek excitedly at two blackjack cards
  {
    const cards = [
      'kkkkkkkkkk',
      'kWtWWkWkWk',
      'kWWWWkWWWk',
      'kWWWWkWWtk',
      'kWWsskkssk',
      ' kSSk kSSk',
      ' kjjk kjjk',
    ];

    const peekLow = setGaze(cloneGrid(), 'down');
    patch(peekLow, 7, 18, cards);

    const peekMid = setGaze(cloneGrid(), 'down');
    patch(peekMid, 7, 15, cards);

    const jackpot = brightGrin(setBrows(setGaze(cloneGrid(), 'wide'), -1, -1), true);
    patch(jackpot, 7, 15, cards);
    patch(jackpot, 18, 2, [' y ', 'yWy', ' y ']); // winning sparkle!

    clips.push(loopClip('peek-cards', [
      step(peekLow, 140),
      step(peekMid, 320),
      step(jackpot, 360),
      step(peekLow, 140),
    ]));
  }

  return clips;
}

// ---------------------------------------------------------------------------
// Binary Delta-RLE Encoder + Round-Trip Verifier
// ---------------------------------------------------------------------------

function gridToIndices(grid) {
  const out = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const ch = grid[y][x];
      if (!(ch in COLOR_INDEX)) {
        throw new Error(`Invalid palette character '${ch}' at (${x}, ${y})`);
      }
      out[y * SIZE + x] = COLOR_INDEX[ch];
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

function encodeClip(clip, baseIndices) {
  const stepIndices = clip.steps.map((s) => gridToIndices(s.grid));
  if (stepIndices.length < 3) throw new Error(`${clip.id}: expected at least 3 steps`);
  if (!framesEqual(stepIndices[0], baseIndices)) {
    throw new Error(`${clip.id}: first frame must exactly match haber.svg base`);
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

  // Deduplicate frames (index 0 is always baseIndices)
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

/** Verifies binary encoding round-trips pixel-for-pixel for every clip and frame. */
function verifyRoundTrip(baseB64, encodedClips, rawClips, baseIndices) {
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
      const expected = gridToIndices(raw.steps[s].grid);
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
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

function writeContactSheets(clips, outDir) {
  mkdirSync(outDir, { recursive: true });
  const scale = 6;
  const cell = SIZE * scale;
  const pad = 8;
  const gutter = 42;
  const perSheet = 6;
  const paletteRgb = PALETTE_KEYS.map((ch) => {
    const n = Number.parseInt(PALETTE[ch].slice(1), 16);
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
            const [R, G, B] = paletteRgb[COLOR_INDEX[st.grid[y][x]]];
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

// ---------------------------------------------------------------------------
// Generate TypeScript Artifact
// ---------------------------------------------------------------------------

const rawClips = buildClips();
const seenIds = new Set();
for (const c of rawClips) {
  if (seenIds.has(c.id)) throw new Error(`Duplicate clip id: ${c.id}`);
  seenIds.add(c.id);
}

const baseIndices = gridToIndices(BASE_GRID);
const baseB64 = encodeBaseRle(baseIndices);
const encodedClips = rawClips.map((clip) => ({ id: clip.id, data: encodeClip(clip, baseIndices) }));

verifyRoundTrip(baseB64, encodedClips, rawClips, baseIndices);

const paletteHexes = PALETTE_KEYS.map((ch) => PALETTE[ch]);
const tsOutput = [
  '// Generated by `npm run animations` (scripts/build-haber-animations.mjs). Do not edit by hand.',
  "import type { PortraitAnimationSet } from '../../functions/portraitAnimation';",
  '',
  'export const HABER_ANIMATIONS: PortraitAnimationSet = {',
  `  size: ${SIZE},`,
  `  palette: ${JSON.stringify(paletteHexes)},`,
  `  base: ${JSON.stringify(baseB64)},`,
  '  clips: [',
  ...encodedClips.map((c) => `    { id: ${JSON.stringify(c.id)}, data: ${JSON.stringify(c.data)} },`),
  '  ],',
  '};',
  '',
].join('\n');

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, tsOutput);

const rawBytes = Buffer.byteLength(tsOutput);
const gzBytes = gzipSync(tsOutput).length;
console.log(`wrote ${encodedClips.length} Haber animations to src/assets/portraits/haber-animations.ts (${rawBytes} B raw, ${gzBytes} B gzipped)`);

const previewFlagIdx = process.argv.indexOf('--preview');
if (previewFlagIdx !== -1 && process.argv[previewFlagIdx + 1]) {
  writeContactSheets(rawClips, process.argv[previewFlagIdx + 1]);
}
