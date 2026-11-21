// Builds the lazy-loaded pixel-art animations for Shevek ("The Shark") in
// src/assets/portraits/shevek-animations.ts using a compact delta-RLE binary format.
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
  step,
} from './portrait-animation-compiler.mjs';

const SHEVEK_SVG_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'shevek.svg');
const OUT_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'shevek-animations.ts');

// All 24 hex values are strictly unique (case-insensitive); duplicate `e: '#1b1c22'` is omitted.
const PALETTE = {
  '.': '#4a6283', // slate-blue background (matches Character.accent)
  k: '#1b1c22', // outline / pupils / dark crease
  h: '#3d2b1f', // untidy dark brown hair
  H: '#5c4330', // hair highlight sheen / notebook leather
  s: '#e2b48d', // skin
  S: '#c48f68', // skin shadow (nose, cheek, neck, eyelid shade, hand shade)
  m: '#7d4436', // half-smile mouth
  c: '#b9b1a0', // plain undyed grey-beige shirt
  C: '#8f8878', // shirt shadow / collar fold
  W: '#ffffff', // pure white (sclera, chalk math, mug rim, glint, card face, paper)
  w: '#dfe8f0', // off-white / cool steam / chalk fade / crisp collar / watch dial
  y: '#f5d04c', // bright yellow / gold (pencil body, % sparkle, chip rim/glint)
  Y: '#c99a26', // pencil shadow / gold shadow
  p: '#e58891', // pencil eraser pink
  b: '#3b2418', // dark brewed coffee
  B: '#6e4730', // warm brown wood / coffee crema
  g: '#9aa8b8', // silver-grey (mug highlight, watch case, coin)
  G: '#5d6b7a', // dark slate (coffee mug body, glasses frame, notebook cover, watch strap)
  l: '#9ee0ff', // ice-blue (math highlight, lens tint, shark-focus shimmer)
  I: '#5aa8cc', // deep ice cyan (shark-focus aura)
  r: '#d64545', // crimson red (bad-card flash, red pip, red chip, notebook ink)
  R: '#8f2424', // deep crimson (card back, dark red chip)
  v: '#2f8a4e', // casino green ($25 chip)
  V: '#1d5c32', // dark casino green (chip shadow)
};

const BASE_GRID = loadBaseGridFromSvg(SHEVEK_SVG_PATH, PALETTE);

// ---------------------------------------------------------------------------
// Pixel grid composition helpers
// ---------------------------------------------------------------------------

function cloneGrid(grid = BASE_GRID) {
  return cloneBaseGrid(grid);
}

function loopClip(id, middleSteps, startMs = 90, endMs = 90) {
  return buildLoopClip(BASE_GRID, id, middleSteps, startMs, endMs);
}

/**
 * Shifts Shevek's head & hair (y=0..14) by (dx, dy) while keeping neck (y=15..16)
 * and shirt/collar (y=17..23) anchored. Bridges y=14 (and above if dy < -1) with
 * 'kSSSSk' at x=9..14 so no floating-head background gap appears when lifting.
 */
function withHeadOffset(dx, dy) {
  const out = cloneGrid(BASE_GRID);
  if (dx === 0 && dy === 0) return out;

  for (let y = 0; y <= 14; y++) {
    for (let x = 0; x < SIZE; x++) {
      out[y][x] = '.';
    }
  }

  if (dy < 0) {
    for (let by = Math.max(0, 15 + dy); by <= 14; by++) {
      patch(out, 9, by, ['kSSSSk']);
    }
  }

  for (let y = 0; y <= 14; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (BASE_GRID[y][x] !== '.') {
        setPx(out, x + dx, y + dy, BASE_GRID[y][x]);
      }
    }
  }
  return out;
}

/**
 * Repositions brows on open forehead skin without corrupting y=6 hair bangs
 * (x=7..8, x=12..14, x=16..17). Call BEFORE setGaze(..., 'up-right').
 */
function setBrows(grid, leftDy = 0, rightDy = 0, dx = 0, dy = 0) {
  for (const x of [9, 10, 11, 15]) {
    setPx(grid, x + dx, 6 + dy, 's');
  }
  fillRect(grid, 8 + dx, 7 + dy, 8, 1, 's');

  if (leftDy < 0) {
    setPx(grid, 10 + dx, 6 + dy, 'h');
    setPx(grid, 9 + dx, 7 + dy, 'h');
  } else if (leftDy > 0) {
    patch(grid, 9 + dx, 7 + dy, ['hh']);
  }

  if (rightDy > 0) {
    patch(grid, 13 + dx, 7 + dy, ['hh']);
  } else if (rightDy < 0) {
    setPx(grid, 15 + dx, 6 + dy, 'S');
  }
  return grid;
}

/** Applies concentrated lowered brows across open y=7 forehead skin. */
function setFocusBrows(grid, dx = 0, dy = 0) {
  patch(grid, 9 + dx, 7 + dy, ['hh']);
  patch(grid, 13 + dx, 7 + dy, ['hh']);
  return grid;
}

/**
 * Adjusts Shevek's single-pixel eyes around (10 + dx, 8 + dy) and (13 + dx, 8 + dy).
 * Modes: 'left' | 'right' | 'up-right' | 'down' | 'half' | 'shut' | 'wide'
 */
function setGaze(grid, mode, dx = 0, dy = 0) {
  const lx = 10 + dx;
  const rx = 13 + dx;
  const ey = 8 + dy;

  if (mode === 'left') {
    patch(grid, lx - 1, ey, ['kW']);
    patch(grid, rx - 1, ey, ['kW']);
  } else if (mode === 'right') {
    patch(grid, lx, ey, ['Wk']);
    patch(grid, rx, ey, ['Wk']);
  } else if (mode === 'up-right') {
    setPx(grid, lx, ey, 'W');
    setPx(grid, rx, ey, 'W');
    setPx(grid, lx + 1, ey - 1, 'k');
    setPx(grid, rx + 1, ey - 1, 'k');
  } else if (mode === 'down') {
    patch(grid, lx, ey, ['S', 'k']);
    patch(grid, rx, ey, ['S', 'k']);
  } else if (mode === 'half') {
    setPx(grid, lx, ey, 'S');
    setPx(grid, rx, ey, 'S');
  } else if (mode === 'shut') {
    patch(grid, lx - 1, ey, ['kk']);
    patch(grid, rx, ey, ['kk']);
  } else if (mode === 'wide') {
    patch(grid, lx - 1, ey, ['Wk']);
    patch(grid, rx, ey, ['kW']);
  }
  return grid;
}

/**
 * Replaces Shevek's asymmetric half-smile ((13, 11) + (10..12, 12)).
 * Modes: 'smirk' | 'flat' | 'smile' | 'sip'
 */
function setMouth(grid, mode, dx = 0, dy = 0) {
  fillRect(grid, 9 + dx, 11 + dy, 6, 2, 's');

  if (mode === 'smirk') {
    patch(grid, 13 + dx, 11 + dy, ['mm']);
    patch(grid, 10 + dx, 12 + dy, ['mmm']);
  } else if (mode === 'flat') {
    patch(grid, 10 + dx, 12 + dy, ['mmmm']);
  } else if (mode === 'smile') {
    setPx(grid, 9 + dx, 11 + dy, 'm');
    setPx(grid, 13 + dx, 11 + dy, 'm');
    patch(grid, 10 + dx, 12 + dy, ['mmm']);
  } else if (mode === 'sip') {
    patch(grid, 11 + dx, 12 + dy, ['mm']);
  } else {
    setPx(grid, 13 + dx, 11 + dy, 'm');
    patch(grid, 10 + dx, 12 + dy, ['mmm']);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// 24 Loopable Shevek Animations
// ---------------------------------------------------------------------------

function buildClips() {
  const clips = [];

  // 1. Quick blink — crisp discipline & steady composure
  {
    const half = setGaze(cloneGrid(), 'half');
    const shut = setGaze(cloneGrid(), 'shut');
    clips.push(
      loopClip('quick-blink', [
        step(half, 60),
        step(shut, 120),
        step(cloneGrid(half), 60),
      ]),
    );
  }

  // 2. Combinatorics glance — keeps the odds of every hand in his head
  {
    const gLeft = setGaze(cloneGrid(), 'left');
    const gUpRight = setGaze(cloneGrid(), 'up-right');
    patch(gUpRight, 9, 6, ['hh']);
    const gRight = setGaze(cloneGrid(), 'right');
    const gBlink = setGaze(cloneGrid(), 'half');
    clips.push(
      loopClip('combinatorics-glance', [
        step(gLeft, 200),
        step(gUpRight, 220),
        step(gRight, 200),
        step(gBlink, 90),
      ]),
    );
  }

  // 3. Raised eyebrow — dry tight-aggressive skepticism
  {
    const arch1 = cloneGrid();
    patch(arch1, 9, 6, ['kk']);
    patch(arch1, 13, 7, ['hh']);
    setPx(arch1, 14, 11, 'm');

    const archHold = cloneGrid(arch1);
    setPx(archHold, 9, 8, 'W');
    setPx(archHold, 13, 7, 'k');

    clips.push(
      loopClip('raised-eyebrow', [
        step(arch1, 180),
        step(archHold, 300),
        step(cloneGrid(arch1), 130),
      ]),
    );
  }

  // 4. Smirk widen — presses bets when the numbers favor him
  {
    const widen1 = setMouth(setFocusBrows(cloneGrid()), 'smirk');
    setPx(widen1, 13, 12, 'm');

    const widenPeak = cloneGrid(widen1);
    setPx(widenPeak, 9, 12, 'm');
    setPx(widenPeak, 11, 8, 'W');
    setPx(widenPeak, 14, 8, 'W');
    patch(widenPeak, 9, 7, ['ss']);
    patch(widenPeak, 9, 6, ['hh']);

    const settle = setGaze(cloneGrid(), 'half');
    clips.push(
      loopClip('smirk-widen', [
        step(widen1, 200),
        step(widenPeak, 280),
        step(cloneGrid(widen1), 150),
        step(settle, 80),
      ]),
    );
  }

  // 5. Analytical tilt — appraises table odds with quiet precision
  {
    const tiltLeft = setGaze(withHeadOffset(-1, 0), 'right', -1, 0);
    const midBlink = setGaze(cloneGrid(), 'half');
    const tiltRight = setGaze(withHeadOffset(1, 0), 'left', 1, 0);
    clips.push(
      loopClip('analytical-tilt', [
        step(tiltLeft, 300),
        step(midBlink, 110),
        step(tiltRight, 300),
      ]),
    );
  }

  // 6. Tuck pencil — keeps a pencil behind his ear
  {
    const lift = setGaze(cloneGrid(), 'right');
    patch(lift, 17, 10, [
      '  kk ',
      ' kypk',
      'kyyk ',
      'ksssk',
      'kssSk',
      'kccCk',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const place = setGaze(cloneGrid(), 'right');
    patch(place, 16, 4, ['   kk ', '  kypk', ' kyyk ', 'kykk  ', 'Yk    ']);
    patch(place, 17, 9, [
      ' ksk ',
      'kssSk',
      'kSSsk',
      'kccCk',
      'kccCk',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const tucked = setMouth(cloneGrid(), 'smirk');
    patch(tucked, 16, 4, ['   kk ', '  kypk', ' kyyk ', 'kykk  ', 'Yk    ']);

    const adjust = setMouth(cloneGrid(), 'smirk');
    patch(adjust, 9, 6, ['hh']);
    patch(adjust, 16, 4, ['   kk ', '  kypk', ' kyyk ', 'kykk  ', 'Yk    ']);
    patch(adjust, 18, 9, [
      ' ksk ',
      'kssSk',
      'kccCk',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const pullOut = setGaze(cloneGrid(), 'right');
    patch(pullOut, 17, 6, [
      '  kk ',
      ' kypk',
      'kyyk ',
      'ksssk',
      'kssSk',
      'kccCk',
      'kccCk',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const lower = setGaze(cloneGrid(), 'half');
    patch(lower, 17, 13, [
      '  kk ',
      ' kypk',
      'ksssk',
      'kccCk',
      'kccck',
      ' ccck',
    ]);

    clips.push(
      loopClip('tuck-pencil', [
        step(lift, 140),
        step(place, 140),
        step(tucked, 260),
        step(adjust, 200),
        step(pullOut, 150),
        step(lower, 120),
      ]),
    );
  }

  // 7. Pencil twirl — college stats habit, fingers spin pencil at chest
  {
    const hands = [' ksssk ', 'kssSSSk', ' kcccCk', ' kcccck'];

    const pHoriz = setGaze(cloneGrid(), 'down');
    patch(pHoriz, 8, 16, ['kkkkkkkkk', 'kpyyyyyHk', 'kkkkkkkkk']);
    patch(pHoriz, 9, 18, hands);

    const pSlash = setGaze(cloneGrid(), 'down');
    patch(pSlash, 11, 14, ['   kk', '  kyk', ' kyHk', 'kpyk ', 'kkk  ']);
    patch(pSlash, 9, 18, hands);

    const pVert = setGaze(cloneGrid(), 'down');
    patch(pVert, 11, 13, ['kkk', 'kpk', 'kyk', 'kyk', 'kYk', 'kHk']);
    patch(pVert, 9, 18, hands);

    const pBack = setGaze(cloneGrid(), 'down');
    patch(pBack, 9, 14, ['kk   ', 'kpk  ', 'kyyk ', ' kYHk', '  kkk']);
    patch(pBack, 9, 18, hands);

    const pFlip = setGaze(cloneGrid(), 'down');
    patch(pFlip, 8, 16, ['kkkkkkkkk', 'kHyyyyypk', 'kkkkkkkkk']);
    patch(pFlip, 9, 18, hands);

    const catchHold = setMouth(setGaze(cloneGrid(), 'down'), 'smirk');
    patch(catchHold, 8, 16, ['kkkkkkkkk', 'kHyyyyypk', 'kkkkkkkkk']);
    patch(catchHold, 9, 18, hands);

    const lower = setGaze(cloneGrid(), 'half');
    patch(lower, 9, 19, ['kkkkkkkkk', 'kHyyyyypk', ' kssSSSk ', ' kccccck ']);

    clips.push(
      loopClip('pencil-twirl', [
        step(pHoriz, 120),
        step(pSlash, 110),
        step(pVert, 110),
        step(pBack, 110),
        step(pFlip, 110),
        step(catchHold, 180),
        step(lower, 100),
      ]),
    );
  }

  // 8. Pencil tap lip — rests eraser at mouth while computing odds
  {
    const raise = setGaze(cloneGrid(), 'right');
    patch(raise, 14, 15, [
      'kpk  ',
      'kYk  ',
      'kyk  ',
      'ksssk',
      'kssSk',
      ' kcck',
      ' kcck',
    ]);

    const tap1 = setGaze(cloneGrid(), 'up-right');
    patch(tap1, 9, 6, ['hh']);
    patch(tap1, 13, 12, [
      'kpk   ',
      'kYyk  ',
      ' kyyk ',
      ' ksssk',
      ' kSSSk',
      '  kcck',
      '  kcck',
      '  kcck',
    ]);

    const tapOff = setGaze(cloneGrid(), 'up-right');
    patch(tapOff, 9, 6, ['hh']);
    patch(tapOff, 14, 13, [
      'kpk   ',
      'kYyk  ',
      ' kyyk ',
      ' ksssk',
      ' kSSSk',
      '  kcck',
      '  kcck',
    ]);

    const tap2 = setMouth(setGaze(cloneGrid(), 'right'), 'smirk');
    patch(tap2, 13, 12, [
      'kpk   ',
      'kYyk  ',
      ' kyyk ',
      ' ksssk',
      ' kSSSk',
      '  kcck',
      '  kcck',
      '  kcck',
    ]);

    clips.push(
      loopClip('pencil-tap-lip', [
        step(raise, 120),
        step(tap1, 240),
        step(tapOff, 120),
        step(tap2, 260),
        step(cloneGrid(raise), 120),
      ]),
    );
  }

  // 9. Air math — sketches odds in the air as + and % chalk symbols appear
  {
    const am1 = setGaze(cloneGrid(), 'up-right');
    patch(am1, 19, 3, [' W ', 'WWw', ' W ']);
    patch(am1, 16, 11, [
      'kp   ',
      'kyk  ',
      ' kyk ',
      ' kssk',
      ' kSSk',
      ' kcck',
      ' kcck',
      ' kcck',
    ]);

    const am2 = setGaze(cloneGrid(), 'up-right');
    setPx(am2, 20, 4, 'l');
    patch(am2, 1, 4, ['W l', ' W ', 'l W']);
    patch(am2, 15, 10, [
      'kp   ',
      'kyk  ',
      ' kyk ',
      ' kssk',
      ' kSSk',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
    ]);

    const am3 = setMouth(setGaze(cloneGrid(), 'left'), 'smirk');
    patch(am3, 1, 4, ['w .', ' w ', '. w']);
    patch(am3, 2, 8, ['WW', 'll']);
    patch(am3, 16, 12, [
      'kp   ',
      'kyk  ',
      ' kssk',
      ' kcck',
      ' kcck',
      ' kcck',
    ]);

    const fade = setGaze(cloneGrid(), 'half');
    setPx(fade, 2, 5, 'l');
    setPx(fade, 20, 4, 'l');
    patch(fade, 17, 15, [
      'kp  ',
      'kyk ',
      'kssk',
      'kcck',
    ]);

    clips.push(
      loopClip('air-math', [
        step(am1, 180),
        step(am2, 220),
        step(am3, 220),
        step(fade, 130),
      ]),
    );
  }

  // 10. Coffee sip — calls it variance and orders another coffee
  {
    const mug = ['kbbbbk', 'kGWGGk', 'kGggGk', 'kGGGGk', ' kkkk '];

    const csLow = setGaze(cloneGrid(), 'down');
    patch(csLow, 14, 15, mug);
    patch(csLow, 15, 18, [' ksssk', 'kssSSk', 'kcccCk']);

    const csMid = setGaze(cloneGrid(), 'down');
    setPx(csMid, 14, 11, 'W');
    setPx(csMid, 15, 10, 'w');
    patch(csMid, 12, 13, mug);
    patch(csMid, 13, 16, [' ksssk ', 'kssSSSk', 'kccccCk', ' kcccck']);

    const csSip = setMouth(setGaze(cloneGrid(), 'half'), 'sip');
    setPx(csSip, 17, 9, 'W');
    setPx(csSip, 18, 7, 'w');
    patch(csSip, 10, 11, mug);
    patch(csSip, 11, 14, [' ksssk ', 'kssSSSk', 'kccccCk', ' kcccck', ' kcccck']);

    const csLower = setMouth(setGaze(cloneGrid(), 'half'), 'smirk');
    setPx(csLower, 18, 14, 'w');
    patch(csLower, 15, 16, mug);
    patch(csLower, 16, 19, [' ksssk', 'kcccCk']);

    clips.push(
      loopClip('coffee-sip', [
        step(csLow, 140),
        step(csMid, 150),
        step(csSip, 360),
        step(csLower, 150),
      ]),
    );
  }

  // 11. Espresso focus — quick shot followed by wide alert shark focus
  {
    const cup = ['kbbk', 'kWWk', 'kggk', ' kk '];

    const efLift = setGaze(cloneGrid(), 'down');
    patch(efLift, 13, 14, cup);
    patch(efLift, 14, 16, [' kssk', 'kssSk', 'kccCk', 'kccck']);

    const efSip = setGaze(cloneGrid(), 'shut');
    patch(efSip, 10, 11, cup);
    patch(efSip, 11, 13, [' kssk', 'kssSk', 'kccCk', 'kccck', 'kccck']);

    const efDrop = setGaze(cloneGrid(), 'wide');
    patch(efDrop, 9, 6, ['kk']);
    patch(efDrop, 15, 18, cup);
    patch(efDrop, 16, 20, [' kssk', 'kccCk']);

    const efPeak = withHeadOffset(0, -1);
    setGaze(efPeak, 'wide', 0, -1);
    patch(efPeak, 9, 5, ['kk']);
    patch(efPeak, 19, 4, [' W', 'lW']);

    const efSettle = setGaze(cloneGrid(), 'wide');

    clips.push(
      loopClip('espresso-focus', [
        step(efLift, 120),
        step(efSip, 180),
        step(efDrop, 140),
        step(efPeak, 280),
        step(efSettle, 120),
      ]),
    );
  }

  // 12. Variance shrug — bad-card flash, calm blink, unbothered shoulder shrug
  {
    const vsCard = setGaze(cloneGrid(), 'down');
    setPx(vsCard, 8, 16, 'r');
    patch(vsCard, 2, 17, ['kkkkkk', 'kWWWWk', 'kWrrWk', 'kWWWWk', 'kkkkkk']);

    const vsBlink = setGaze(cloneGrid(), 'shut');
    patch(vsBlink, 2, 19, ['kkkkkk', 'kWWWWk', 'kWrrWk', 'kkkkkk']);

    const vsShrug = withHeadOffset(0, 1);
    setMouth(vsShrug, 'smirk', 0, 1);
    patch(vsShrug, 9, 7, ['hh']);
    patch(vsShrug, 2, 16, ['   kkkkc', ' kkccccc', 'kccccccc']);
    patch(vsShrug, 14, 16, ['ckkkk   ', 'ccccckk ', 'ccccccck']);

    const vsSettle = setMouth(cloneGrid(), 'smirk');
    patch(vsSettle, 9, 6, ['hh']);

    clips.push(
      loopClip('variance-shrug', [
        step(vsCard, 240),
        step(vsBlink, 140),
        step(vsShrug, 300),
        step(vsSettle, 140),
      ]),
    );
  }

  // 13. Press bet — pushes chips forward when numbers favor him
  {
    const stackReady = setGaze(cloneGrid(), 'down');
    patch(stackReady, 15, 18, [
      ' krrk ',
      'kWWWWk',
      'kvvvvk',
      'kWWWWk',
      'kssSsk',
      ' kccCk',
    ]);

    const pushMid = setGaze(cloneGrid(), 'down');
    patch(pushMid, 10, 18, [
      ' krrk ',
      'kWWWWk',
      'kvvvvk',
      'kWWWWk',
      'kssSsk',
      ' kccCk',
    ]);

    const pushOut = setMouth(setFocusBrows(cloneGrid()), 'smirk');
    patch(pushOut, 6, 18, [
      '  y   ',
      ' krrk ',
      'kWWWWk',
      'kvvvvk',
      'kWWWWk',
      'kVVVVk',
    ]);
    patch(pushOut, 13, 20, [
      ' kssk ',
      'kssSSk',
      ' kccCk',
      '  kcck',
    ]);

    const retract = setGaze(cloneGrid(), 'half');
    patch(retract, 6, 19, [
      ' krrk ',
      'kWWWWk',
      'kvvvvk',
      'kWWWWk',
      'kVVVVk',
    ]);
    patch(retract, 16, 21, [
      ' kssk',
      'kssSk',
      ' kcck',
    ]);

    clips.push(
      loopClip('press-bet', [
        step(stackReady, 150),
        step(pushMid, 160),
        step(pushOut, 280),
        step(retract, 130),
      ]),
    );
  }

  // 14. Double-down tap — textbook two-finger tap onto felt
  {
    const handPoised = [
      '  kkkkk ',
      ' kssScck',
      'kssSScck',
      'kskskCck',
      ' k k    ',
    ];

    const ready = setFocusBrows(setGaze(cloneGrid(), 'down'));
    patch(ready, 13, 17, handPoised);

    const tap1 = setFocusBrows(setGaze(cloneGrid(), 'down'));
    patch(tap1, 13, 19, handPoised);
    setPx(tap1, 12, 22, 'W');
    setPx(tap1, 18, 22, 'W');

    const lift = setGaze(cloneGrid(), 'down');
    patch(lift, 13, 17, handPoised);

    const tap2 = setMouth(setFocusBrows(setGaze(cloneGrid(), 'down')), 'smirk');
    patch(tap2, 13, 19, handPoised);
    setPx(tap2, 12, 22, 'y');
    setPx(tap2, 18, 22, 'y');
    patch(tap2, 8, 21, ['krrk', 'kWWk']);

    const settle = setGaze(cloneGrid(), 'half');
    patch(settle, 16, 21, [' kssk', 'kssCk', ' kcck']);

    clips.push(
      loopClip('double-down-tap', [
        step(ready, 120),
        step(tap1, 110),
        step(lift, 90),
        step(tap2, 140),
        step(settle, 130),
      ]),
    );
  }

  // 15. Card-count scan — rhythmic Hi-Lo sweep across table seats
  {
    const scanLeft = setMouth(setFocusBrows(setGaze(cloneGrid(), 'left')), 'flat');
    const scanDown = setMouth(setFocusBrows(setGaze(cloneGrid(), 'down')), 'flat');
    const scanRight = setMouth(setFocusBrows(setGaze(cloneGrid(), 'right')), 'flat');
    const tally = setMouth(setGaze(cloneGrid(), 'up-right'), 'smirk');
    const blink = setGaze(cloneGrid(), 'half');

    clips.push(
      loopClip('card-count-scan', [
        step(scanLeft, 160),
        step(scanDown, 160),
        step(scanRight, 160),
        step(tally, 200),
        step(blink, 90),
      ]),
    );
  }

  // 16. Adjust collar — straightens plain grey shirt collar
  {
    const reach = setGaze(cloneGrid(), 'down');
    patch(reach, 6, 19, [' ksk ', 'kssSk', 'kSSsk', 'kccCk', 'kccck']);
    patch(reach, 13, 19, [' ksk ', 'kSssk', 'ksSSk', 'kCcck', 'kccck']);

    const tug = withHeadOffset(0, -1);
    setPx(tug, 9, 17, 'w');
    setPx(tug, 14, 17, 'w');
    patch(tug, 6, 18, [' ksk ', 'kssSk', 'kSSsk', 'kccCk', 'kccck']);
    patch(tug, 13, 18, [' ksk ', 'kSssk', 'ksSSk', 'kCcck', 'kccck']);

    const smooth = cloneGrid();
    setPx(smooth, 9, 17, 'w');
    setPx(smooth, 14, 17, 'w');
    patch(smooth, 4, 19, [' ksk ', 'kssSk', 'kSSsk', 'kccCk', 'kccck']);
    patch(smooth, 15, 19, [' ksk ', 'kSssk', 'ksSSk', 'kCcck', 'kccck']);

    const drop = setGaze(cloneGrid(), 'half');
    patch(drop, 4, 21, [' ksk ', 'kssSk', 'kccck']);
    patch(drop, 15, 21, [' ksk ', 'kSssk', 'kccck']);

    clips.push(
      loopClip('adjust-collar', [
        step(reach, 140),
        step(tug, 220),
        step(smooth, 200),
        step(drop, 120),
      ]),
    );
  }

  // 17. Hair tousle — runs hand through untidy dark hair; tufts spring back
  {
    const reachUp = setGaze(cloneGrid(), 'up-right');
    patch(reachUp, 18, 8, [
      ' ksk ',
      'kssSk',
      'kSSsk',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' ccck',
    ]);

    const ruffle1 = setGaze(cloneGrid(), 'half');
    patch(ruffle1, 9, 1, ['..kkk.. ', 'khhhhkk ']);
    patch(ruffle1, 12, 0, [' kssk ', 'kssSSk', ' kSSck', '  kcck']);
    patch(ruffle1, 17, 4, [
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'ccck',
    ]);

    const ruffle2 = setMouth(cloneGrid(), 'smirk');
    patch(ruffle2, 9, 1, ['kk.kk.. ', 'khhkhhk ']);
    patch(ruffle2, 11, 6, ['hhs']);
    patch(ruffle2, 7, 0, [' kssk ', 'kssSSk', ' kSSck', '  kcck']);
    patch(ruffle2, 13, 1, ['kkkk  ', 'kccck ', '  kcck']);
    patch(ruffle2, 16, 4, [
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'kcck',
      'ccck',
    ]);

    const springBack = cloneGrid();
    setPx(springBack, 11, 2, 'H');
    setPx(springBack, 14, 2, 'H');
    patch(springBack, 18, 8, [
      ' ksk ',
      'kssSk',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' ccck',
    ]);

    const settle = setGaze(cloneGrid(), 'half');
    patch(settle, 18, 13, [' ksk ', 'kssSk', ' kcck', ' kcck', ' kcck', ' ccck']);

    clips.push(
      loopClip('hair-tousle', [
        step(reachUp, 130),
        step(ruffle1, 160),
        step(ruffle2, 160),
        step(springBack, 150),
        step(settle, 120),
      ]),
    );
  }

  // 18. Glasses glint — raises and pushes up reading glasses with crisp glint
  {
    const lift = setGaze(cloneGrid(), 'down');
    patch(lift, 8, 14, ['GGG  GGG', 'GlWGGWlG', 'GGG  GGG']);
    patch(lift, 15, 16, [' ksk ', 'kssSk', ' kcck', ' kcck']);

    const perch = setMouth(cloneGrid(), 'flat');
    patch(perch, 7, 8, ['G']);
    patch(perch, 16, 8, ['GG']);
    patch(perch, 8, 7, ['GGG  GGG', 'GlkGGklG', 'GGG  GGG']);
    patch(perch, 16, 10, [
      ' ksk ',
      'kssSk',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' ccck',
    ]);

    const glint1 = cloneGrid();
    patch(glint1, 7, 8, ['G']);
    patch(glint1, 16, 8, ['GG']);
    patch(glint1, 8, 7, ['GWG  GWG', 'GWlGGWlG', 'GGG  GGG']);
    patch(glint1, 17, 11, [
      ' ksk ',
      'kssSk',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' kcck',
      ' ccck',
    ]);

    const glint2 = setMouth(cloneGrid(), 'smirk');
    patch(glint2, 7, 8, ['G']);
    patch(glint2, 16, 8, ['GG']);
    patch(glint2, 8, 7, ['GGW  GGW', 'GlWGGGlW', 'GGG  GGG']);
    patch(glint2, 19, 5, [' W ', 'WlW', ' W ']);

    const lower = setGaze(cloneGrid(), 'half');
    patch(lower, 8, 14, ['GGG  GGG', 'GlWGGWlG', 'GGG  GGG']);
    patch(lower, 15, 16, [' ksk ', 'kssSk', ' kcck', ' kcck']);

    clips.push(
      loopClip('glasses-glint', [
        step(lift, 130),
        step(perch, 150),
        step(glint1, 170),
        step(glint2, 190),
        step(lower, 130),
      ]),
    );
  }

  // 19. Check watch — unhurried wristwatch check
  {
    const armLow = setGaze(cloneGrid(), 'down');
    patch(armLow, 3, 18, [
      '    kkk   ',
      '   kGGGk  ',
      '  kgWWwgk ',
      ' kccGGGssk',
      'kCCckkSSk ',
    ]);

    const check1 = setMouth(setGaze(cloneGrid(), 'down'), 'flat');
    patch(check1, 4, 15, [
      '    kkkk   ',
      '   kGGGGk  ',
      '  kgWkWwgk ',
      ' kcckWssSk ',
      'kCCckGGGGk ',
      'kccckkkk   ',
    ]);

    const glint = cloneGrid(check1);
    patch(glint, 7, 16, ['lW ', ' WW']);

    const check2 = setGaze(cloneGrid(check1), 'half');
    const lower = cloneGrid(armLow);

    clips.push(
      loopClip('check-watch', [
        step(armLow, 140),
        step(check1, 280),
        step(glint, 200),
        step(check2, 160),
        step(lower, 130),
      ]),
    );
  }

  // 20. Pocket notebook — opens notebook, jots stats with pencil, snaps shut
  {
    const openBook = setGaze(cloneGrid(), 'down');
    patch(openBook, 6, 16, [
      'kkkkkkkkkk',
      'kGWWGkWWGk',
      'kGWwGkWwGk',
      'kGWWGkWWGk',
      'kGWWGkWWGk',
      'kGGGGGGGGk',
      ' ksskkssk ',
    ]);

    const jot1 = setGaze(cloneGrid(), 'down');
    patch(jot1, 6, 16, [
      'kkkkkkkkkk',
      'kGWWGkWWGk',
      'kGkkGkWWGk',
      'kGWWGkWWGk',
      'kGWWGkWWGk',
      'kGGGGGGGGk',
      ' kssk     ',
    ]);
    patch(jot1, 10, 15, [
      '    kyy',
      '   kyYk',
      '  kyYk ',
      ' ksssk ',
      ' kSScck',
      '  kccck',
    ]);

    const jot2 = setFocusBrows(setGaze(cloneGrid(), 'down'));
    patch(jot2, 6, 16, [
      'kkkkkkkkkk',
      'kGWWGkWWGk',
      'kGkkGkWWGk',
      'kGkrGkWWGk',
      'kGWWGkWWGk',
      'kGGGGGGGGk',
      ' kssk     ',
    ]);
    patch(jot2, 11, 15, [
      '    kyy',
      '   kyYk',
      '  kyYk ',
      ' ksssk ',
      ' kSScck',
      '  kccck',
    ]);

    const snapShut = setGaze(cloneGrid(), 'half');
    patch(snapShut, 8, 17, [
      'kkkkkk',
      'kGGGGk',
      'kGHGGk',
      'kGGGGk',
      'kWWWWk',
      'kkkkkk',
      ' kssk ',
    ]);

    const tuckAway = cloneGrid();
    patch(tuckAway, 8, 19, [
      'kkkkkk',
      'kGGGGk',
      'kGHGGk',
      'kWWWWk',
      'kkkkkk',
    ]);

    clips.push(
      loopClip('pocket-notebook', [
        step(openBook, 150),
        step(jot1, 200),
        step(jot2, 220),
        step(snapShut, 180),
        step(tuckAway, 130),
      ]),
    );
  }

  // 21. Coin balance — spins and balances silver coin on fingertip
  {
    const poise = setGaze(cloneGrid(), 'right');
    patch(poise, 17, 10, [
      ' kggk ',
      'kgWWgk',
      ' kggk ',
      '  ksk ',
      ' kssSk',
      ' kccCk',
      ' kccck',
      ' kccck',
      ' cccck',
    ]);

    const spinEdge = setGaze(cloneGrid(), 'right');
    patch(spinEdge, 18, 10, [
      'l k l',
      '  W  ',
      '  g  ',
      ' ksk ',
      'kssSk',
      'kccCk',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const spinFlat = setMouth(setGaze(cloneGrid(), 'right'), 'smirk');
    patch(spinFlat, 17, 9, [
      '  kggk',
      ' kWWgk',
      '  kggk',
      '      ',
      '  ksk ',
      ' kssSk',
      ' kccCk',
      ' kccck',
      ' kccck',
      ' cccck',
    ]);

    const spinEdge2 = setGaze(cloneGrid(), 'right');
    patch(spinEdge2, 18, 10, [
      '  W  ',
      '  g  ',
      '  W  ',
      ' ksk ',
      'kssSk',
      'kccCk',
      'kccck',
      'kccck',
      ' ccck',
    ]);

    const catchSettle = setGaze(cloneGrid(), 'half');
    patch(catchSettle, 17, 14, [
      ' kggk ',
      'kssWgk',
      'kssSSk',
      ' kccCk',
      ' cccck',
    ]);

    clips.push(
      loopClip('coin-balance', [
        step(poise, 150),
        step(spinEdge, 140),
        step(spinFlat, 160),
        step(spinEdge2, 140),
        step(catchSettle, 170),
      ]),
    );
  }

  // 22. Textbook nod — single crisp analytical nod of approval
  {
    const focus = setMouth(setFocusBrows(cloneGrid()), 'smirk');

    const nodDown = withHeadOffset(0, 1);
    setFocusBrows(nodDown, 0, 1);
    setGaze(nodDown, 'half', 0, 1);

    const nodHold = withHeadOffset(0, 1);
    setFocusBrows(nodHold, 0, 1);
    setGaze(nodHold, 'shut', 0, 1);

    const returnFocus = setMouth(setGaze(cloneGrid(), 'half'), 'smirk');

    clips.push(
      loopClip('textbook-nod', [
        step(focus, 130),
        step(nodDown, 160),
        step(nodHold, 140),
        step(returnFocus, 120),
      ]),
    );
  }

  // 23. Shark focus — cold predatory calm with ice-blue eye glint
  {
    const narrow = setMouth(setFocusBrows(cloneGrid()), 'flat');
    patch(narrow, 11, 7, ['SS']);
    patch(narrow, 9, 8, ['Sk']);
    patch(narrow, 13, 8, ['kS']);

    const glintPeak = setMouth(setFocusBrows(cloneGrid()), 'flat');
    patch(glintPeak, 11, 7, ['SS']);
    patch(glintPeak, 8, 8, ['IWk']);
    patch(glintPeak, 13, 8, ['kWI']);

    const glintFade = setMouth(setFocusBrows(cloneGrid()), 'smirk');
    patch(glintFade, 9, 8, ['lk']);
    patch(glintFade, 13, 8, ['kl']);

    const blink = setGaze(cloneGrid(), 'half');

    clips.push(
      loopClip('shark-focus', [
        step(narrow, 160),
        step(glintPeak, 280),
        step(glintFade, 180),
        step(blink, 100),
      ]),
    );
  }

  // 24. Hole card peek — peeks card corner, % flash pops, calm smirk
  {
    const cardsFlat = setGaze(cloneGrid(), 'down');
    patch(cardsFlat, 15, 17, [
      'kkkkkkk',
      'kRRRRRk',
      'kRyRyRk',
      'kRRRRRk',
      ' ksssk ',
      '  kcck ',
    ]);

    const peekCorner = setGaze(cloneGrid(), 'down');
    patch(peekCorner, 15, 16, [
      'kkkkkkk',
      'kWWWRRk',
      'kWrWRRk',
      'kRRRRRk',
      ' ksssk ',
      '  kcck ',
    ]);

    const calcSpark = cloneGrid(peekCorner);
    patch(calcSpark, 9, 6, ['hh']);
    setMouth(calcSpark, 'smirk');
    patch(calcSpark, 19, 3, ['y W', ' W ', 'W y']);

    const layFlat = setMouth(setGaze(cloneGrid(), 'half'), 'smirk');
    patch(layFlat, 15, 17, [
      'kkkkkkk',
      'kRRRRRk',
      'kRyRyRk',
      'kRRRRRk',
      ' ksssk ',
      '  kcck ',
    ]);

    const withdraw = setGaze(cloneGrid(), 'half');
    patch(withdraw, 15, 19, [
      'kkkkkkk',
      'kRRRRRk',
      'kRyRyRk',
      ' ksssk ',
      '  kcck ',
    ]);

    clips.push(
      loopClip('hole-card-peek', [
        step(cardsFlat, 150),
        step(peekCorner, 240),
        step(calcSpark, 260),
        step(layFlat, 160),
        step(withdraw, 120),
      ]),
    );
  }

  return clips;
}

compileAnimations({
  name: 'Shevek',
  scriptRelPath: 'scripts/build-shevek-animations.mjs',
  exportName: 'SHEVEK_ANIMATIONS',
  outPath: OUT_PATH,
  outRelPath: 'src/assets/portraits/shevek-animations.ts',
  palette: PALETTE,
  baseGrid: BASE_GRID,
  clips: buildClips(),
  previewDir: getPreviewDir(),
});
