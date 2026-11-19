// Builds the lazy-loaded pixel-art animations for Haber in
// src/assets/portraits/haber-animations.ts using a compact delta-RLE binary format.
// Run with `npm run animations` after editing.
// Pass `--preview <dir>` to also emit 6x nearest-neighbor PNG contact sheets for inspection.

import { join } from 'node:path';
import {
  ROOT_DIR,
  SIZE,
  cloneGrid as cloneBaseGrid,
  compileAnimations,
  fillRect,
  getPreviewDir,
  loadBaseGridFromSvg,
  loopClip as buildLoopClip,
  patch,
  setPx,
  shiftGrid,
  step,
} from './portrait-animation-compiler.mjs';

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

const BASE_GRID = loadBaseGridFromSvg(HABER_SVG_PATH, PALETTE);

// ---------------------------------------------------------------------------
// Pixel grid composition helpers
// ---------------------------------------------------------------------------

function cloneGrid(grid = BASE_GRID) {
  return cloneBaseGrid(grid);
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

function loopClip(id, middleSteps, startMs = 90, endMs = 90) {
  return buildLoopClip(BASE_GRID, id, middleSteps, startMs, endMs);
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

compileAnimations({
  name: 'Haber',
  scriptRelPath: 'scripts/build-haber-animations.mjs',
  exportName: 'HABER_ANIMATIONS',
  outPath: OUT_PATH,
  outRelPath: 'src/assets/portraits/haber-animations.ts',
  palette: PALETTE,
  baseGrid: BASE_GRID,
  clips: buildClips(),
  previewDir: getPreviewDir(),
});
