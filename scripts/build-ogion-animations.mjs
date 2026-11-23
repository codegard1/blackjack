// Builds the lazy-loaded pixel-art animations for Ogion ("The Rock") in
// src/assets/portraits/ogion-animations.ts using a compact delta-RLE binary format.
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

const OGION_SVG_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'ogion.svg');
const OUT_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'ogion-animations.ts');

const PALETTE = {
  '.': '#5b7046', // mossy green background (accent)
  k: '#1e1a17', // dark outline / closed eyes / pupils
  s: '#d9a77c', // skin
  S: '#b8835c', // nose / skin shadow / half-lids
  g: '#d4d1c8', // grey hair fringe, brows, mustache, beard
  G: '#9e9a90', // dark grey beard / mouth crease shadow
  c: '#6b4a2f', // brown travelling cloak
  C: '#4a3220', // dark brown cloak shadow
  t: '#a89a7a', // tan inner tunic
  // Extra FX & prop colors (all hex values strictly unique)
  W: '#ffffff', // pure white (sclera, cards, gulls, steam highlight, glint)
  w: '#efe9dc', // warm cream (stoneware mug, smoke, wind wisp, lightning highlight)
  a: '#cfc3aa', // stoneware mug shadow
  y: '#f5d04c', // bright gold/brass (lantern core, lightning, ember highlight)
  Y: '#c8962e', // weathered brass (lantern frame, compass, spyglass, spectacles)
  o: '#f28c38', // warm amber/autumn (lantern flame, pipe ember, autumn leaf)
  r: '#e04646', // bright crimson (compass needle, card pip, modest chip)
  m: '#965340', // warm lip / briar pipe bowl
  b: '#3b2316', // dark brewed tea / pipe stem
  l: '#cde0e6', // pale mist / rain highlight / Zzz
  I: '#8de0f5', // bright bay cyan (raindrop, spectacle glass tint)
  p: '#d48272', // warm rosy cheek
};

const BASE_GRID = loadBaseGridFromSvg(OGION_SVG_PATH, PALETTE);

// ---------------------------------------------------------------------------
// Pixel grid composition helpers
// ---------------------------------------------------------------------------

function cloneGrid(grid = BASE_GRID) {
  return cloneBaseGrid(grid);
}

function loopClip(id, middleSteps, startMs = 90, endMs = 90) {
  return buildLoopClip(BASE_GRID, id, middleSteps, startMs, endMs);
}

function isHeadOrBeardPixel(x, y) {
  if (y <= 14) return BASE_GRID[y][x] !== '.';
  if (y >= 15 && y <= 17) return x >= 9 && x <= 14;
  if (y === 18) return x >= 10 && x <= 13;
  if (y === 19) return x >= 11 && x <= 12;
  return false;
}

/** Shifts Ogion's head and full beard (including y=15..19 overlap) over an anchored cloak. */
function withHeadOffset(dx, dy) {
  const out = cloneGrid();
  if (dx === 0 && dy === 0) return out;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isHeadOrBeardPixel(x, y)) out[y][x] = '.';
    }
  }
  // Restore underlying cloak shoulder outline (y=15) and chest (y=16..19) behind beard
  patch(out, 3, 15, ['kkkkkkkkkkkkkkkkkk']);
  patch(out, 9, 16, ['cccccc', 'cccccc']);
  patch(out, 10, 18, ['cccc']);
  patch(out, 11, 19, ['cc']);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (isHeadOrBeardPixel(x, y)) {
        setPx(out, x + dx, y + dy, BASE_GRID[y][x]);
      }
    }
  }
  // When lifting head up (dy === -1), y=15 beard moves to y=14 and needs side outlines
  if (dy === -1) {
    setPx(out, 8 + dx, 14, 'k');
    setPx(out, 15 + dx, 14, 'k');
  }
  return out;
}

/** Repositions eyebrows vertically from base row (y=6), shifted by optional (dx, dy). */
function setBrows(grid, leftDy = 0, rightDy = 0, dx = 0, dy = 0) {
  fillRect(grid, 9 + dx, 6 + dy, 2, 1, 's');
  fillRect(grid, 13 + dx, 6 + dy, 2, 1, 's');
  fillRect(grid, 9 + dx, 6 + leftDy + dy, 2, 1, 'g');
  fillRect(grid, 13 + dx, 6 + rightDy + dy, 2, 1, 'g');
  return grid;
}

/** Sets Ogion's eyes around base sockets (9..10, 7) and (13..14, 7), preserving x=8,15 skin. */
function setEyeMode(grid, mode, dx = 0, dy = 0) {
  const lx = 9 + dx;
  const rx = 13 + dx;
  const ey = 7 + dy;

  if (mode === 'shut') {
    patch(grid, lx, ey, ['kk']);
    patch(grid, rx, ey, ['kk']);
  } else if (mode === 'half') {
    patch(grid, lx, ey, ['SS']);
    patch(grid, rx, ey, ['SS']);
  } else if (mode === 'open') {
    patch(grid, lx, ey, ['Wk']);
    patch(grid, rx, ey, ['kW']);
  } else if (mode === 'left') {
    patch(grid, lx, ey, ['kW']);
    patch(grid, rx, ey, ['kW']);
  } else if (mode === 'right') {
    patch(grid, lx, ey, ['Wk']);
    patch(grid, rx, ey, ['Wk']);
  } else if (mode === 'up-right') {
    setBrows(grid, -1, -1, dx, dy);
    patch(grid, lx, ey, ['Wk']);
    patch(grid, rx, ey, ['Wk']);
  } else if (mode === 'down') {
    patch(grid, lx, ey, ['SS']);
    patch(grid, rx, ey, ['SS']);
    patch(grid, lx, ey + 1, ['Wk']);
    patch(grid, rx, ey + 1, ['kW']);
  } else if (mode === 'happy') {
    setBrows(grid, -1, -1, dx, dy);
    patch(grid, lx - 1, ey - 1, [' k ', 'ksk']);
    patch(grid, rx, ey - 1, [' k ', 'ksk']);
  }
  return grid;
}

/** Parts Ogion's mustache/beard cleanly at y=11 (x=10..13) for smile or firm expression. */
function setSmile(grid, mode, dx = 0, dy = 0) {
  if (mode === 'warm') {
    patch(grid, 10 + dx, 11 + dy, ['kmmk']);
    setPx(grid, 8 + dx, 9 + dy, 'p');
    setPx(grid, 15 + dx, 9 + dy, 'p');
  } else if (mode === 'firm') {
    patch(grid, 10 + dx, 11 + dy, ['kkkk']);
  }
  return grid;
}

/** Sways Ogion's lower beard (y=16..19) horizontally by `dir` (-1 left, +1 right) over cloak. */
function swayBeard(grid, dir = 1, gust = false) {
  if (dir === 0) return grid;
  fillRect(grid, 8, 16, 8, 3, 'c');
  fillRect(grid, 9, 19, 6, 1, 'c');

  if (!gust) {
    patch(grid, 9, 16, ['GggggG']);
    patch(grid, 9 + dir, 17, ['GggggG']);
    patch(grid, 10 + dir, 18, ['GggG']);
    patch(grid, 11 + dir, 19, ['gg']);
  } else {
    patch(grid, 9 + dir, 16, ['GggggG']);
    patch(grid, 9 + dir, 17, ['GggggG']);
    patch(grid, 10 + 2 * dir, 18, ['GggG']);
    patch(grid, 11 + 2 * dir, 19, ['gg']);
  }
  return grid;
}

// Unused shared utility reference retained for parity with sibling builders
void shiftGrid;

// ---------------------------------------------------------------------------
// 24 Loopable Ogion Animations
// ---------------------------------------------------------------------------

function buildClips() {
  const clips = [];

  // 1. Slow blink open
  {
    const half = setEyeMode(cloneGrid(), 'half');
    const open = setBrows(setEyeMode(cloneGrid(), 'open'), -1, -1);

    clips.push(loopClip('blink-open', [
      step(half, 100),
      step(open, 440),
      step(half, 100),
    ]));
  }

  // 2. One-eye peek
  {
    const leftHalf = patch(cloneGrid(), 9, 7, ['SS']);
    const leftOpen = setBrows(cloneGrid(), -1, 0);
    patch(leftOpen, 9, 7, ['Wk']);

    clips.push(loopClip('one-eye-peek', [
      step(leftHalf, 90),
      step(leftOpen, 380),
      step(leftHalf, 90),
    ]));
  }

  // 3. Knowing nod
  {
    const dip1 = withHeadOffset(0, 1);
    const dip2 = withHeadOffset(0, 2);

    clips.push(loopClip('knowing-nod', [
      step(dip1, 120),
      step(dip2, 260),
      step(dip1, 120),
    ]));
  }

  // 4. Firm head shake
  {
    const left = setSmile(withHeadOffset(-1, 0), 'firm', -1, 0);
    const center = setSmile(cloneGrid(), 'firm');
    const right = setSmile(withHeadOffset(1, 0), 'firm', 1, 0);

    clips.push(loopClip('firm-head-shake', [
      step(left, 180),
      step(center, 100),
      step(right, 180),
      step(center, 100),
      step(left, 160),
    ]));
  }

  // 5. Beard stroke
  {
    const raise = cloneGrid();
    patch(raise, 13, 17, [' kssk ', 'kssSSk', ' kSSck', ' kccck', ' kccck']);

    const strokeTop = cloneGrid();
    patch(strokeTop, 10, 13, [
      ' ksssk ',
      'kssSSSk',
      ' kSSSck',
      '  kccck',
      '   kccck',
      '    kccck',
      '     kccck',
    ]);

    const strokeMid = cloneGrid();
    patch(strokeMid, 10, 15, [
      ' ksssk ',
      'kssSSSk',
      ' kSSSck',
      '  kccck',
      '   kccck',
      '    kccck',
    ]);

    const strokeLow = cloneGrid();
    patch(strokeLow, 10, 17, [
      ' ksssk ',
      'kssSSSk',
      ' kSSSck',
      '  kccck',
      '   kccck',
    ]);

    const lower = cloneGrid();
    patch(lower, 13, 19, [' kssk ', 'kssSSk', ' kccck', ' kccck']);

    clips.push(loopClip('beard-stroke', [
      step(raise, 140),
      step(strokeTop, 220),
      step(strokeMid, 240),
      step(strokeLow, 240),
      step(lower, 140),
    ]));
  }

  // 6. Harbor breeze
  {
    const gust1 = swayBeard(cloneGrid(), 1, false);
    patch(gust1, 0, 5, ['llll ', '  www']);
    patch(gust1, 1, 11, ['www']);
    patch(gust1, 17, 7, ['gk', 'gk', 'gk', 'gk']);

    const gust2 = swayBeard(cloneGrid(), 1, true);
    patch(gust2, 2, 3, ['wwww']);
    patch(gust2, 17, 6, ['llll ', '  www']);
    patch(gust2, 18, 12, ['www']);
    patch(gust2, 17, 7, ['gk', 'gk', 'gk', 'gk', 'gk', 'gk']);

    const gust3 = swayBeard(cloneGrid(), 1, false);
    patch(gust3, 18, 4, ['wwwwl']);
    patch(gust3, 19, 9, ['llll']);
    patch(gust3, 20, 13, ['www']);
    patch(gust3, 17, 9, ['gk', 'gk', 'gk']);

    const fade = cloneGrid();
    patch(fade, 21, 5, ['ll']);
    patch(fade, 22, 10, ['l']);

    clips.push(loopClip('harbor-breeze', [
      step(gust1, 150),
      step(gust2, 180),
      step(gust3, 180),
      step(fade, 130),
    ]));
  }

  // 7. Tea sip
  {
    const liftLow = setEyeMode(cloneGrid(), 'down');
    patch(liftLow, 14, 15, [
      '  W   ',
      ' l    ',
      ' kbbk ',
      'kwwwwk',
      'kwaaak',
      ' kaak ',
      'kssSck',
      ' kccck',
      ' kccck',
    ]);

    const liftMid = setEyeMode(cloneGrid(), 'down');
    patch(liftMid, 13, 10, [' W ', 'l  ']);
    patch(liftMid, 11, 13, [
      'kbbbbk',
      'kwwwwkk',
      'kwaaak ',
      ' kaak  ',
      ' kssk  ',
      ' kcck  ',
      '  kccck',
      '   kccck',
    ]);

    const sip = setBrows(cloneGrid(), -1, -1);
    patch(sip, 10, 11, [
      'kbbbbk',
      'kwwwwkk',
      'kwaaak ',
      ' kaak  ',
      ' kssk  ',
      ' kcck  ',
      '  kccck',
      '   kccck',
      '    kccck',
    ]);

    const content = setSmile(cloneGrid(), 'warm');
    patch(content, 14, 15, [
      ' kbbk ',
      'kwwwwk',
      ' kaak ',
      'kssSck',
      ' kccck',
      ' kccck',
    ]);

    const lower = cloneGrid();
    patch(lower, 15, 18, [' kbbk ', 'kwwwwk', ' kaak ', ' kssck', '  kcck', '  kcck']);

    clips.push(loopClip('tea-sip', [
      step(liftLow, 150),
      step(liftMid, 160),
      step(sip, 380),
      step(content, 200),
      step(lower, 130),
    ]));
  }

  // 8. Pipe puff
  {
    const pipeIn = cloneGrid();
    patch(pipeIn, 12, 11, ['kbbkmok', '   kmok', '    kkk']);
    patch(pipeIn, 15, 14, [' kssk ', 'kssSSk', ' kccck', '  kccck']);

    const puffGlow = cloneGrid();
    patch(puffGlow, 12, 11, ['kbbkmok', '   kyok', '    kkk']);
    patch(puffGlow, 15, 14, [' kssk ', 'kssSSk', ' kccck', '  kccck']);

    const exhale1 = cloneGrid();
    patch(exhale1, 11, 11, ['bm']);
    patch(exhale1, 14, 8, [' wW ', 'W  W', ' Ww ']);
    patch(exhale1, 16, 14, ['kbbkmok', '   kssk', '   kcck', '   kcck']);

    const exhale2 = cloneGrid();
    patch(exhale2, 16, 4, [' lWW ', 'W   W', 'W   W', ' WWl ']);
    patch(exhale2, 17, 17, ['kbbkmok', '   kssk', '   kcck']);

    const exhale3 = cloneGrid();
    patch(exhale3, 18, 2, [' lWl ', 'l   l', ' lWl ']);

    const fade = cloneGrid();
    patch(fade, 20, 1, [' l ', 'l l']);

    clips.push(loopClip('pipe-puff', [
      step(pipeIn, 180),
      step(puffGlow, 280),
      step(exhale1, 180),
      step(exhale2, 180),
      step(exhale3, 180),
      step(fade, 140),
    ]));
  }

  // 9. Hood pull
  {
    const reach = cloneGrid();
    patch(reach, 2, 11, [' ksk ', 'kssSk', 'kcck ', 'kcck ']);
    patch(reach, 17, 11, [' ksk ', 'kSssk', ' kcck', ' kcck']);

    const pullHalf = cloneGrid();
    patch(pullHalf, 6, 1, [
      '  kkkkkkkk  ',
      ' kcccccccck ',
      'kCccccccccCk',
      'kCcksssskcCk',
    ]);
    patch(pullHalf, 3, 7, [' ksk ', 'kssSk', 'kcck ', 'kcck ', 'kcck ', 'kcck ', 'kcck ', 'kcck ']);
    patch(pullHalf, 16, 7, [' ksk ', 'kSssk', ' kcck', ' kcck', ' kcck', ' kcck', ' kcck', ' kcck']);

    const hoodUp = cloneGrid();
    patch(hoodUp, 4, 0, [
      '    kkkkkkkk    ',
      '   kcccccccck   ',
      '  kCccccccccCk  ',
      ' kCccCCCCCCccCk ',
      ' kCckCCCCCCkcCk ',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kCck        kcCk',
      'kcck        kcck',
      'kcck        kcck',
    ]);

    clips.push(loopClip('hood-pull', [
      step(reach, 140),
      step(pullHalf, 150),
      step(hoodUp, 360),
      step(pullHalf, 140),
      step(reach, 120),
    ]));
  }

  // 10. Rain squall
  {
    const rain1 = cloneGrid();
    patch(rain1, 2, 1, ['l', 'I']);
    patch(rain1, 20, 3, ['l', 'I']);
    patch(rain1, 11, 0, ['l', 'I']);

    const rain2 = cloneGrid();
    patch(rain2, 2, 5, ['l', 'I']);
    patch(rain2, 4, 1, ['l', 'I']);
    patch(rain2, 20, 7, ['l', 'I']);
    patch(rain2, 10, 1, ['W W']);
    patch(rain2, 19, 12, ['l', 'I']);

    const rain3 = cloneGrid();
    patch(rain3, 2, 9, ['l', 'I']);
    patch(rain3, 4, 6, ['l', 'I']);
    patch(rain3, 20, 11, ['l', 'I']);
    patch(rain3, 18, 2, ['l', 'I']);
    patch(rain3, 1, 13, ['l', 'I']);

    const rain4 = cloneGrid();
    patch(rain4, 4, 11, ['l', 'I']);
    patch(rain4, 18, 7, ['l', 'I']);
    patch(rain4, 21, 13, ['l', 'I']);
    patch(rain4, 3, 14, ['W']);

    const rain5 = cloneGrid();
    patch(rain5, 18, 12, ['l', 'I']);
    patch(rain5, 5, 13, ['l']);

    clips.push(loopClip('rain-squall', [
      step(rain1, 140),
      step(rain2, 140),
      step(rain3, 140),
      step(rain4, 140),
      step(rain5, 120),
    ]));
  }

  // 11. Horizon scan
  {
    const openLeft = setBrows(setEyeMode(cloneGrid(), 'left'), -1, -1);
    const openCenter = setBrows(setEyeMode(cloneGrid(), 'open'), -1, -1);
    const openRight = setBrows(setEyeMode(cloneGrid(), 'right'), -1, -1);
    const halfShut = setEyeMode(cloneGrid(), 'half');

    clips.push(loopClip('horizon-scan', [
      step(openLeft, 240),
      step(openCenter, 120),
      step(openRight, 260),
      step(openCenter, 120),
      step(halfShut, 100),
    ]));
  }

  // 12. Lantern raise
  {
    const raiseLow = setEyeMode(cloneGrid(), 'half');
    patch(raiseLow, 17, 14, [' kkk ', ' kYk ', 'kYoYk', 'kYyYk', ' kkk ', ' kssk', ' kcck']);

    const holdMid = setBrows(setEyeMode(cloneGrid(), 'right'), -1, -1);
    patch(holdMid, 17, 10, [' kkk ', ' kYk ', 'kYoYk', 'kyWYk', ' kkk ', ' kssk', ' kcck', ' kcck']);
    setPx(holdMid, 16, 12, 'y');
    setPx(holdMid, 22, 12, 'y');

    const glowPeak = setBrows(setEyeMode(cloneGrid(), 'right'), -1, -1);
    patch(glowPeak, 17, 10, [' kkk ', ' kYk ', 'kyWyk', 'kWWok', ' kkk ', ' kssk', ' kcck', ' kcck']);
    setPx(glowPeak, 16, 11, 'y');
    setPx(glowPeak, 16, 13, 'y');
    setPx(glowPeak, 22, 11, 'y');
    setPx(glowPeak, 22, 13, 'y');
    setPx(glowPeak, 19, 9, 'y');

    clips.push(loopClip('lantern-raise', [
      step(raiseLow, 140),
      step(holdMid, 260),
      step(glowPeak, 300),
      step(holdMid, 160),
      step(raiseLow, 130),
    ]));
  }

  // 13. Compass check
  {
    const lift = setEyeMode(cloneGrid(), 'down');
    patch(lift, 15, 16, [' kYYk ', 'kYWWYk', 'kWrrWk', 'kYWWYk', ' kYYk ', ' kssSk', ' kccck']);

    const swingEast = setEyeMode(cloneGrid(), 'down');
    patch(swingEast, 14, 14, [' kYYk ', 'kYWWYk', 'kWWrrk', 'kYWWYk', ' kYYk ', ' kssSk', ' kccck']);

    const swingWest = setEyeMode(cloneGrid(), 'down');
    patch(swingWest, 14, 14, [' kYYk ', 'kYWWYk', 'krrWWk', 'kYWWYk', ' kYYk ', ' kssSk', ' kccck']);

    const settleNorth = setEyeMode(cloneGrid(), 'down');
    patch(settleNorth, 14, 14, [' kYYk ', 'kYWrYk', 'kWWrWk', 'kYWWYk', ' kYYk ', ' kssSk', ' kccck']);
    setPx(settleNorth, 18, 13, 'y');

    clips.push(loopClip('compass-check', [
      step(lift, 140),
      step(swingEast, 200),
      step(swingWest, 200),
      step(settleNorth, 300),
      step(lift, 130),
    ]));
  }

  // 14. Spyglass peek
  {
    const liftLow = setEyeMode(cloneGrid(), 'right');
    patch(liftLow, 16, 14, ['kkkk  ', 'kYYyk ', 'kYYyk ', 'kssSk ', ' kcck ']);

    const aimClosed = setBrows(cloneGrid(), 0, -1);
    patch(aimClosed, 13, 6, ['kkkkk', 'kYYIk', 'kkkkk']);
    patch(aimClosed, 16, 9, ['kssk', 'kcck', ' kcck', ' kcck', ' kcck', ' kcck']);

    const extend = setBrows(cloneGrid(), 0, -1);
    patch(extend, 13, 6, ['kkkkkkkkkk', 'kYYykYYyIk', 'kkkkkkkkkk']);
    setPx(extend, 21, 7, 'W');
    patch(extend, 16, 9, ['kssSk', ' kcck', ' kcck', ' kcck', ' kcck', ' kcck']);

    clips.push(loopClip('spyglass-peek', [
      step(liftLow, 140),
      step(aimClosed, 180),
      step(extend, 360),
      step(aimClosed, 160),
      step(liftLow, 130),
    ]));
  }

  // 15. Stand pat palm
  {
    const raise = setEyeMode(cloneGrid(), 'half');
    patch(raise, 16, 16, [' ksk ', 'ksssk', 'kssSk', ' kSSk', ' kcck']);

    const palmOut = setEyeMode(cloneGrid(), 'open');
    patch(palmOut, 16, 12, [' ksksk ', 'ksssssk', 'ksssssk', ' ksSSsk', '  kSSk ', '  kcck ']);

    const palmBeat = setSmile(setEyeMode(cloneGrid(), 'open'), 'warm');
    patch(palmBeat, 15, 12, [' ksksk ', 'ksssssk', 'ksssssk', ' ksSSsk', '  kSSk ', '  kcck ']);

    clips.push(loopClip('stand-pat-palm', [
      step(raise, 140),
      step(palmOut, 320),
      step(palmBeat, 180),
      step(raise, 130),
    ]));
  }

  // 16. Single chip
  {
    const holdChip = setEyeMode(cloneGrid(), 'down');
    patch(holdChip, 13, 17, [' krk ', 'krWrk', ' krk ', 'ksssk', ' kcck']);

    const placeChip = setEyeMode(cloneGrid(), 'down');
    patch(placeChip, 10, 19, [' krk ', 'krWrk', ' krk ']);
    patch(placeChip, 14, 19, ['kssSk', ' kcck']);

    const tapApprove = cloneGrid();
    patch(tapApprove, 10, 20, [' krk ', 'krWrk', ' krk ']);
    patch(tapApprove, 14, 18, ['kssSk', ' kcck', ' kcck']);

    clips.push(loopClip('single-chip', [
      step(holdChip, 140),
      step(placeChip, 240),
      step(tapApprove, 260),
      step(holdChip, 140),
    ]));
  }

  // 17. Count thirteen
  {
    const oneFinger = cloneGrid();
    patch(oneFinger, 17, 13, [' ksk ', ' ksk ', 'kssSk', 'kSSSk', ' kcck']);

    const twoFingers = cloneGrid();
    patch(twoFingers, 17, 13, ['ksksk', 'ksksk', 'kssSk', 'kSSSk', ' kcck']);

    const threeFingers = cloneGrid();
    patch(threeFingers, 17, 13, ['ksksksk', 'ksksksk', 'ksssSSk', ' kSSSSk', '  kccck']);

    const nodCount = withHeadOffset(0, 1);
    patch(nodCount, 17, 14, ['ksksksk', 'ksksksk', 'ksssSSk', ' kSSSSk', '  kccck']);

    const lower = cloneGrid();
    patch(lower, 18, 16, [' kssk ', 'kssSSk', ' kcck ']);

    clips.push(loopClip('count-thirteen', [
      step(oneFinger, 200),
      step(twoFingers, 200),
      step(threeFingers, 260),
      step(nodCount, 220),
      step(lower, 130),
    ]));
  }

  // 18. Peaceful doze
  {
    const dip1 = withHeadOffset(0, 1);
    const dip2 = withHeadOffset(0, 2);
    patch(dip2, 19, 3, ['lll', ' l ', 'lll']);

    const dip2Fade = withHeadOffset(0, 2);
    patch(dip2Fade, 18, 1, ['llll', '  l ', ' l  ', 'llll']);

    const riseCalm = withHeadOffset(0, 1);

    clips.push(loopClip('peaceful-doze', [
      step(dip1, 240),
      step(dip2, 320),
      step(dip2Fade, 320),
      step(riseCalm, 220),
    ]));
  }

  // 19. Leaf drift
  {
    const driftIn = cloneGrid();
    patch(driftIn, 3, 1, ['oy ', ' oo']);

    const hoverCrown = cloneGrid();
    patch(hoverCrown, 7, 0, [' oy', 'oo ']);

    const landCrown = cloneGrid();
    patch(landCrown, 11, 0, ['oy', 'oo']);

    const driftOut = cloneGrid();
    patch(driftOut, 16, 1, [' oy', 'oo ']);

    const fadeOut = cloneGrid();
    patch(fadeOut, 20, 3, ['oy']);

    clips.push(loopClip('leaf-drift', [
      step(driftIn, 180),
      step(hoverCrown, 180),
      step(landCrown, 380),
      step(driftOut, 180),
      step(fadeOut, 150),
    ]));
  }

  // 20. Warm smile
  {
    const softSmile = setSmile(cloneGrid(), 'warm');
    const beam = setSmile(setEyeMode(cloneGrid(), 'happy'), 'warm');
    setPx(beam, 11, 12, 'G');
    setPx(beam, 12, 12, 'G');

    clips.push(loopClip('warm-smile', [
      step(softSmile, 140),
      step(beam, 380),
      step(softSmile, 140),
    ]));
  }

  // 21. Spectacles peek
  {
    const raise = cloneGrid();
    patch(raise, 8, 11, ['kkk  kkk', 'kIkYYkIk', 'kkk  kkk']);
    patch(raise, 16, 12, ['kssk', 'kcck', ' kcck', ' kcck']);

    const perch = cloneGrid();
    patch(perch, 8, 6, ['kkk  kkk', 'kIkYYkIk', 'kkk  kkk']);

    const peekGlint = setBrows(cloneGrid(), -1, -1);
    patch(peekGlint, 8, 6, ['kkk  kkk', 'kWkYYkWk', 'kkk  kkk']);

    clips.push(loopClip('spectacles-peek', [
      step(raise, 140),
      step(perch, 160),
      step(peekGlint, 340),
      step(perch, 160),
      step(raise, 130),
    ]));
  }

  // 22. Card square
  {
    const crooked = setEyeMode(cloneGrid(), 'down');
    patch(crooked, 7, 17, ['kkkk  kkkk', 'kWrk  kWWk', 'kWWk  kWrk', 'kkkk  kkkk']);
    patch(crooked, 4, 19, ['kss', 'kcc']);
    patch(crooked, 17, 19, ['ssk', 'cck']);

    const nudge = setEyeMode(cloneGrid(), 'down');
    patch(nudge, 8, 17, ['kkkk kkkk', 'kWrk kWWk', 'kWWk kWrk', 'kkkk kkkk']);
    patch(nudge, 5, 19, ['kss', 'kcc']);
    patch(nudge, 16, 19, ['ssk', 'cck']);

    const aligned = cloneGrid();
    patch(aligned, 8, 17, ['kkkkkkkk', 'kWrkkWWk', 'kWWkkWrk', 'kkkkkkkk']);
    patch(aligned, 5, 19, ['kss', 'kcc']);
    patch(aligned, 16, 19, ['ssk', 'cck']);

    const withdraw = cloneGrid();
    patch(withdraw, 8, 18, ['kkkkkkkk', 'kWWkkWWk', 'kkkkkkkk']);

    clips.push(loopClip('card-square', [
      step(crooked, 180),
      step(nudge, 180),
      step(aligned, 300),
      step(withdraw, 140),
    ]));
  }

  // 23. Storm lightning
  {
    const flash1 = cloneGrid();
    patch(flash1, 1, 0, ['  yW', ' yW ', 'yWW ', ' yW ', '  W ']);
    setPx(flash1, 9, 3, 'w');
    setPx(flash1, 8, 4, 'w');
    setPx(flash1, 8, 5, 'w');
    setPx(flash1, 4, 16, 't');

    const flashDark = cloneGrid();
    patch(flashDark, 1, 1, ['  l ', ' l  ', ' ll ', '  l ']);

    const flash2 = cloneGrid();
    patch(flash2, 1, 0, ['  WW', ' WWW', 'yWW ', ' yW ', '  y ']);
    setPx(flash2, 9, 3, 'w');
    setPx(flash2, 8, 4, 'w');
    setPx(flash2, 4, 16, 't');

    const afterglow = cloneGrid();
    patch(afterglow, 2, 1, [' l ', 'l  ']);

    clips.push(loopClip('storm-lightning', [
      step(flash1, 90),
      step(flashDark, 110),
      step(flash2, 100),
      step(afterglow, 140),
    ]));
  }

  // 24. Gull watch
  {
    const gullEnter = setEyeMode(cloneGrid(), 'up-right');
    patch(gullEnter, 16, 2, ['W   W', ' W W ', '  W  ']);

    const gullFlap = setEyeMode(cloneGrid(), 'up-right');
    patch(gullFlap, 18, 3, [' WWW ', 'W   W']);

    const gullGlide = setEyeMode(cloneGrid(), 'up-right');
    patch(gullGlide, 20, 1, ['W   ', ' W W', '  W ']);

    const gullExit = setBrows(setEyeMode(cloneGrid(), 'right'), 0, -1);
    patch(gullExit, 22, 2, ['WW']);

    const settle = setEyeMode(cloneGrid(), 'half');

    clips.push(loopClip('gull-watch', [
      step(gullEnter, 160),
      step(gullFlap, 180),
      step(gullGlide, 180),
      step(gullExit, 140),
      step(settle, 100),
    ]));
  }

  return clips;
}

compileAnimations({
  name: 'Ogion',
  scriptRelPath: 'scripts/build-ogion-animations.mjs',
  exportName: 'OGION_ANIMATIONS',
  outPath: OUT_PATH,
  outRelPath: 'src/assets/portraits/ogion-animations.ts',
  palette: PALETTE,
  baseGrid: BASE_GRID,
  clips: buildClips(),
  previewDir: getPreviewDir(),
});
