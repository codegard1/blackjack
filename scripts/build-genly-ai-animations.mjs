// Builds the lazy-loaded pixel-art animations for Genly Ai (The Tourist) in
// src/assets/portraits/genly-ai-animations.ts using a compact delta-RLE binary format.
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

const GENLY_SVG_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'genly-ai.svg');
const OUT_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'genly-ai-animations.ts');

const PALETTE = {
  // Base SVG colors (14 exact unique colors from src/assets/portraits/genly-ai.svg — NO duplicate 'e')
  '.': '#a9c6d6', // icy light blue background (Character.accent)
  k: '#17110e', // dark outline / pupils / camera strap
  h: '#1a1412', // black hair & eyebrows
  s: '#7a4a2e', // dark warm brown skin
  S: '#5e3721', // skin shadow (nose, neck, eyelid shade)
  w: '#f2ece2', // eye sclera / warm off-white
  m: '#3f1f12', // mouth
  f: '#efe6d2', // cream fur collar
  F: '#cbbfa5', // fur collar shadow
  p: '#2f6f73', // teal parka
  P: '#22504f', // teal parka shadow
  z: '#1c2a2a', // parka center zipper
  g: '#d3d8dc', // silver-grey camera body
  L: '#2b2b2b', // dark 2x2 camera lens

  // High-contrast Prop & FX colors (all strictly unique hexes)
  W: '#ffffff', // pure white (flash, lens cloth, snow, breath, cards, teeth, badge)
  y: '#f2c14e', // bright gold (flash burst, badge clasp, laminate glint)
  Y: '#c9932c', // deep gold shadow
  G: '#8d969e', // medium metallic grey (camera shading / viewfinder)
  r: '#c9403c', // crimson red (shutter dot, rulebook, map pin, card pips, chip)
  R: '#8c2420', // deep crimson (rulebook spine, card backs)
  b: '#3b6ea5', // conference blue (badge lanyard, map river)
  B: '#244973', // deep navy (lanyard neck tether)
  c: '#4ab8e8', // vivid cyan (sweat highlight, snow/breath accent)
  C: '#1b6ca8', // deep cobalt (sweat shade, high-contrast mist/snow shadow)
  l: '#7ec8eb', // ice blue (lens reflection)
  t: '#e6cfb0', // warm tan (rulebook text, badge text, folded map, paper cup)
  T: '#bfa37e', // tan shadow (map crease, cup sleeve shade)
  o: '#4a2816', // dark hot cocoa / coffee inside cup
};

const BASE_GRID = loadBaseGridFromSvg(GENLY_SVG_PATH, PALETTE);

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
 * Clears Genly's resting chest camera ((14..17, 21..23)) and strap ((15, 20)) to parka teal 'p'.
 * Preserves zipper shadow 'P' at x=13 and outer parka border 'P' at x=22.
 */
function clearChestCamera(grid) {
  setPx(grid, 15, 20, 'p');
  fillRect(grid, 14, 21, 4, 3, 'p');
  return grid;
}

/**
 * Moves Genly's head (y <= 14, x=7..16) by (dx, dy) while keeping his neck (y=15),
 * fur collar (y=16..19), and parka/camera (y=20..23) anchored without gaps or orphans.
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
    // Extend neck kSSk (x=10..13) upward to meet the lifted chin without a sky gap
    for (let ny = 14; ny >= Math.max(0, 15 + dy); ny--) {
      patch(out, 10, ny, ['kSSk']);
    }
  } else if (dy >= 1 && Math.abs(dx) >= 2) {
    // Prevent base neck pixels at (10..13, 15) from peeking beside far-shifted chins
    fillRect(out, 10, 15, 4, 1, '.');
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
 * Repositions Genly's eyebrows relative to base row y=6 ((9..10, 6) & (13..14, 6)),
 * preserving temple hair tufts at (8..9, 5) and (14..15, 5).
 * Accepts named modes ('normal', 'up'/'high', 'low', 'furrow'/'furrowed', 'worried', 'skeptical')
 * or numeric offset browDy in [-1, 1].
 */
function setBrows(grid, mode = 'normal', dx = 0, dy = 0) {
  // Restore clean base brow zone (y=5..7) without erasing temple hair at (9,5) and (14,5)
  patch(grid, 9 + dx, 5 + dy, ['hs', 'ss', 'ss']);
  patch(grid, 13 + dx, 5 + dy, ['sh', 'ss', 'ss']);

  if (mode === 'furrow' || mode === 'furrowed') {
    setPx(grid, 9 + dx, 6 + dy, 'h');
    setPx(grid, 10 + dx, 7 + dy, 'h');
    setPx(grid, 13 + dx, 7 + dy, 'h');
    setPx(grid, 14 + dx, 6 + dy, 'h');
    return grid;
  }
  if (mode === 'worried') {
    setPx(grid, 9 + dx, 7 + dy, 'h');
    setPx(grid, 10 + dx, 6 + dy, 'h');
    setPx(grid, 13 + dx, 6 + dy, 'h');
    setPx(grid, 14 + dx, 7 + dy, 'h');
    return grid;
  }

  let lDy = 0;
  let rDy = 0;
  if (mode === 'up' || mode === 'high') {
    lDy = -1;
    rDy = -1;
  } else if (mode === 'low') {
    lDy = 1;
    rDy = 1;
  } else if (mode === 'skeptical') {
    lDy = 1;
    rDy = 0;
  } else if (typeof mode === 'number') {
    lDy = mode;
    rDy = mode;
  }

  fillRect(grid, 9 + dx, 6 + dy + lDy, 2, 1, 'h');
  fillRect(grid, 13 + dx, 6 + dy + rDy, 2, 1, 'h');
  return grid;
}

/**
 * Adjusts Genly's eyes around (9+dx..10+dx, 8+dy) and (13+dx..14+dx, 8+dy),
 * keeping sclera 'w' paired with pupil 'k' for crisp contrast on dark skin 's',
 * and preserving nose bridge at x=11..12.
 */
function setGaze(grid, mode = 'right', dx = 0, dy = 0) {
  const lx = 9 + dx;
  const rx = 13 + dx;
  const ey = 8 + dy;

  // Reset eye sockets (x=8..10, 13..15 at y=8) and down-gaze row (x=9..10, 13..14 at y=9)
  fillRect(grid, lx - 1, ey, 3, 1, 's');
  fillRect(grid, rx, ey, 3, 1, 's');
  fillRect(grid, lx, ey + 1, 2, 1, 's');
  fillRect(grid, rx, ey + 1, 2, 1, 's');

  if (mode === 'right') {
    patch(grid, lx, ey, ['wk']);
    patch(grid, rx, ey, ['wk']);
  } else if (mode === 'left') {
    patch(grid, lx, ey, ['kw']);
    patch(grid, rx, ey, ['kw']);
  } else if (mode === 'wide') {
    patch(grid, lx - 1, ey, ['WkW']);
    patch(grid, rx, ey, ['WkW']);
  } else if (mode === 'down' || mode === 'down-right') {
    patch(grid, lx, ey, ['SS', 'wk']);
    patch(grid, rx, ey, ['SS', 'wk']);
  } else if (mode === 'down-left') {
    patch(grid, lx, ey, ['SS', 'kw']);
    patch(grid, rx, ey, ['SS', 'kw']);
  } else if (mode === 'up' || mode === 'up-right') {
    patch(grid, lx, ey - 1, ['wk']);
    patch(grid, rx, ey - 1, ['wk']);
  } else if (mode === 'up-left') {
    patch(grid, lx, ey - 1, ['kw']);
    patch(grid, rx, ey - 1, ['kw']);
  } else if (mode === 'half') {
    patch(grid, lx, ey, ['SS']);
    patch(grid, rx, ey, ['SS']);
  } else if (mode === 'shut') {
    patch(grid, lx, ey, ['kk']);
    patch(grid, rx, ey, ['kk']);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// 24 Loopable Genly Ai Animations
// ---------------------------------------------------------------------------

function buildClips() {
  const clips = [];

  // 1. Raises chest camera to eye and snaps a flash photo
  {
    const liftMid = clearChestCamera(setGaze(cloneGrid(), 'down'));
    patch(liftMid, 13, 14, [
      ' kkkk   ',
      'kggGrk  ',
      'kgLLgsk ',
      'kgLLsSk ',
      ' kkkkppk',
      '   kpppk',
    ]);

    const aim = clearChestCamera(cloneGrid());
    setPx(aim, 9, 8, 'S');
    setPx(aim, 10, 8, 'k');
    patch(aim, 11, 6, [
      ' kkkk    ',
      'kggGrk   ',
      'kgLLgsk  ',
      'kgLLsSk  ',
      ' kkkkpk  ',
      '    kppk ',
      '    kpPk ',
      '     kppk',
      '     kpPk',
      '     kppk',
      '     kppk',
      '     kppk',
      '     kppk',
      '     kppk',
    ]);

    const flash1 = cloneGrid(aim);
    patch(flash1, 10, 4, [
      '   y   ',
      ' y W y ',
      '  WWW  ',
      'yWWWWW ',
      '  WWW  ',
      ' y W y ',
      '   y   ',
    ]);

    const flash2 = cloneGrid(aim);
    patch(flash2, 11, 5, [
      ' y W y ',
      '  yWy  ',
      ' yWWWy ',
      '  yWy  ',
      ' y   y ',
    ]);

    const lower = setGaze(cloneGrid(liftMid), 'half');

    clips.push(loopClip('camera-snap', [
      step(liftMid, 110),
      step(aim, 190),
      step(flash1, 80),
      step(flash2, 110),
      step(lower, 130),
    ]));
  }

  // 2. Lifts camera and nervously polishes lens with a white cloth
  {
    const liftedCameraBase = () => {
      const g = clearChestCamera(setGaze(cloneGrid(), 'down'));
      patch(g, 13, 17, [
        ' kkkk ',
        'kggggk',
        'kgLLgk',
        'kgLLgk',
        ' kkkk ',
      ]);
      patch(g, 8, 19, [
        '  kssk',
        ' kpsSk',
        ' kppk ',
      ]);
      return g;
    };

    const clothReady = liftedCameraBase();
    patch(clothReady, 18, 18, [
      'kWWk  ',
      'kwwsk ',
      ' kSSpk',
      '  kppk',
    ]);

    const wipeLeft = liftedCameraBase();
    patch(wipeLeft, 14, 18, [
      ' kWWk  ',
      'kWWwsk ',
      'kwwSSpk',
      '  kpppk',
    ]);

    const wipeRight = liftedCameraBase();
    setPx(wipeRight, 15, 19, 'l');
    patch(wipeRight, 15, 19, [
      ' kWWsk ',
      'kwwSSpk',
      '  kpppk',
    ]);

    const wipeLeft2 = cloneGrid(wipeLeft);

    const shine = cloneGrid(clothReady);
    setPx(shine, 15, 19, 'W');
    setPx(shine, 16, 19, 'l');
    setPx(shine, 15, 20, 'l');
    setPx(shine, 14, 18, 'y');
    setPx(shine, 17, 20, 'y');

    clips.push(loopClip('camera-wipe', [
      step(clothReady, 120),
      step(wipeLeft, 150),
      step(wipeRight, 150),
      step(wipeLeft2, 140),
      step(shine, 220),
    ]));
  }

  // 3. Diagonal light glint across the resting camera lens
  {
    const g1 = cloneGrid();
    setPx(g1, 14, 21, 'W');
    setPx(g1, 15, 22, 'W');
    setPx(g1, 16, 22, 'l');

    const g2 = cloneGrid();
    patch(g2, 13, 20, [
      '  y   ',
      ' yWy  ',
      'yWWWy ',
      ' yWl  ',
    ]);

    const g3 = cloneGrid();
    setPx(g3, 16, 22, 'l');
    setPx(g3, 15, 23, 'l');
    setPx(g3, 16, 23, 'W');
    setPx(g3, 17, 23, 'y');

    clips.push(loopClip('lens-glint', [
      step(g1, 110),
      step(g2, 200),
      step(g3, 120),
    ]));
  }

  // 4. Finds everyone's friendliness suspicious — darts eyes with furrowed brows
  {
    const leftSuspicious = setBrows(setGaze(cloneGrid(), 'left'), 'furrow');
    patch(leftSuspicious, 11, 11, ['mms']);

    const leftSquint = cloneGrid(leftSuspicious);
    patch(leftSquint, 9, 8, ['kS']);
    patch(leftSquint, 13, 8, ['kS']);

    const rightSuspicious = setBrows(cloneGrid(), 'furrow');
    patch(rightSuspicious, 11, 11, ['smm']);

    const centerBlink = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('suspicious-glance', [
      step(leftSuspicious, 260),
      step(leftSquint, 220),
      step(rightSuspicious, 240),
      step(centerBlink, 90),
    ]));
  }

  // 5. Startled wide eyes and nervous Adam's apple gulp
  {
    const wideStartle = setBrows(setGaze(cloneGrid(), 'wide'), 'up');
    patch(wideStartle, 11, 11, ['kks', 'mms']);

    const gulpUp = setBrows(setGaze(withHeadOffset(0, -1), 'wide', 0, -1), 'up', 0, -1);
    patch(gulpUp, 11, 10, ['mms']);
    patch(gulpUp, 10, 14, ['kssk']);

    const gulpDown = setBrows(setGaze(cloneGrid(), 'wide'), 'up');
    patch(gulpDown, 11, 11, ['mms']);
    patch(gulpDown, 10, 15, ['kssk']);

    const exhale = setGaze(cloneGrid(), 'half');
    patch(exhale, 11, 11, ['mkm']);

    clips.push(loopClip('wide-eyed-gulp', [
      step(wideStartle, 200),
      step(gulpUp, 140),
      step(gulpDown, 170),
      step(exhale, 160),
    ]));
  }

  // 6. High-nerve jittery double blink with quick left glance
  {
    const half1 = setGaze(cloneGrid(), 'half');
    const shut1 = setGaze(cloneGrid(), 'shut');
    const peekLeft = setGaze(cloneGrid(), 'left');
    const shut2 = setGaze(cloneGrid(), 'shut');
    const half2 = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('nervous-double-blink', [
      step(half1, 60),
      step(shut1, 80),
      step(peekLeft, 120),
      step(shut2, 90),
      step(half2, 60),
    ]));
  }

  // 7. Nervous sweat drop forms on right temple and slides down
  {
    const bead = setGaze(cloneGrid(), 'wide');
    patch(bead, 16, 6, [' k ', 'kck', 'kCk', ' k ']);

    const slide1 = setGaze(cloneGrid(), 'wide');
    patch(slide1, 16, 6, [' k  ', 'kWk ', 'kcck', 'kCCk', ' kk ']);

    const slide2 = setGaze(cloneGrid(), 'wide');
    patch(slide2, 16, 9, [' k  ', 'kWk ', 'kcck', 'kCCk', ' kk ']);

    const splash = setGaze(cloneGrid(), 'half');
    setPx(splash, 17, 14, 'C');
    setPx(splash, 19, 14, 'c');
    setPx(splash, 18, 15, 'C');

    clips.push(loopClip('sweat-drop', [
      step(bead, 140),
      step(slide1, 180),
      step(slide2, 180),
      step(splash, 120),
    ]));
  }

  // 8. Polite hesitant hit ("One more card can't hurt. Probably.")
  {
    const addPoliteSmile = (g) => {
      setPx(g, 10, 10, 'm');
      setPx(g, 14, 10, 'm');
      return g;
    };

    const raise = addPoliteSmile(cloneGrid());
    patch(raise, 17, 14, [
      '  k   ',
      ' ksk  ',
      ' ksk  ',
      'ksssk ',
      'ksSSk ',
      ' kppk ',
    ]);

    const tapDown = addPoliteSmile(setGaze(cloneGrid(), 'down'));
    patch(tapDown, 17, 16, [
      '  k   ',
      ' ksk  ',
      'ksssk ',
      'ksSSk ',
      ' kppk ',
    ]);

    const tapHold = addPoliteSmile(setBrows(cloneGrid(), 'up'));
    patch(tapHold, 17, 14, [
      '  k   ',
      ' ksk  ',
      ' ksk  ',
      'ksssk ',
      'ksSSk ',
      ' kppk ',
    ]);

    const lower = setGaze(cloneGrid(), 'half');
    patch(lower, 17, 17, [
      '  k   ',
      ' ksk  ',
      'ksssk ',
      ' kppk ',
    ]);

    clips.push(loopClip('polite-hit', [
      step(raise, 130),
      step(tapDown, 150),
      step(tapHold, 220),
      step(lower, 120),
    ]));
  }

  // 9. Earnest, stiff double-nod with polite smile
  {
    const down1 = withHeadOffset(0, 1);
    setPx(down1, 10, 11, 'm');
    setPx(down1, 14, 11, 'm');

    const down2 = setGaze(withHeadOffset(0, 2), 'half', 0, 2);
    setPx(down2, 10, 12, 'm');
    setPx(down2, 14, 12, 'm');

    const upMid = setGaze(cloneGrid(), 'half');
    setPx(upMid, 10, 10, 'm');
    setPx(upMid, 14, 10, 'm');

    const down3 = setGaze(withHeadOffset(0, 1), 'half', 0, 1);

    clips.push(loopClip('polite-nod', [
      step(down1, 90),
      step(down2, 150),
      step(upMid, 100),
      step(down3, 130),
    ]));
  }

  // 10. Small hesitant wave with an awkward tight toothy smile
  {
    const awkwardSmile = (g) => patch(g, 10, 11, ['mwwm']);

    const raise = awkwardSmile(cloneGrid());
    patch(raise, 17, 15, [
      ' kkkk ',
      'kssssk',
      'ksSssk',
      ' kSSk ',
      ' kppk ',
    ]);

    const waveLeft = awkwardSmile(cloneGrid());
    patch(waveLeft, 17, 12, [
      ' kkk  ',
      'ksssk ',
      'kssSsk',
      ' kSSk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
    ]);

    const waveRight = awkwardSmile(setGaze(cloneGrid(), 'half'));
    patch(waveRight, 18, 12, [
      '  kkk ',
      ' ksssk',
      'kssSsk',
      ' kSSk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
    ]);

    const waveLeft2 = awkwardSmile(setGaze(cloneGrid(), 'left'));
    patch(waveLeft2, 17, 12, [
      ' kkk  ',
      'ksssk ',
      'kssSsk',
      ' kSSk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
      ' kppk ',
    ]);

    const lower = setGaze(cloneGrid(), 'half');
    patch(lower, 17, 15, [
      ' kkkk ',
      'kssssk',
      'ksSssk',
      ' kSSk ',
      ' kppk ',
    ]);

    clips.push(loopClip('awkward-wave', [
      step(raise, 110),
      step(waveLeft, 150),
      step(waveRight, 150),
      step(waveLeft2, 150),
      step(lower, 110),
    ]));
  }

  // 11. Hunches fur-collared shoulders and turns out both palms apologetically
  {
    const shrugMid = withHeadOffset(0, 1);
    patch(shrugMid, 3, 15, ['kfkfkf']);
    patch(shrugMid, 15, 15, ['fkfkfk']);
    patch(shrugMid, 2, 16, ['kfffffff', 'kffFffff']);
    patch(shrugMid, 15, 16, ['fffffffk', 'ffffFffk']);
    patch(shrugMid, 1, 18, [' kkk ', 'ksssk', 'ksSsk', 'kpppk']);
    patch(shrugMid, 18, 18, [' kkk ', 'ksssk', 'ksSsk', 'kpppk']);

    const shrugPeak = setBrows(withHeadOffset(-1, 1), 'worried', -1, 1);
    patch(shrugPeak, 10, 12, ['mmmm']);
    patch(shrugPeak, 3, 15, ['kfkfk']);
    patch(shrugPeak, 14, 15, ['kfkfkfk']);
    patch(shrugPeak, 2, 16, ['kfffff', 'kffFff']);
    patch(shrugPeak, 15, 16, ['fffffffk', 'ffffFffk']);
    patch(shrugPeak, 1, 15, [' kkk ', 'ksssk', 'ksSSk', 'kpppk', 'kpppk']);
    patch(shrugPeak, 18, 15, ['  kkk ', ' ksssk', ' kSSsk', ' kpppk', ' kpppk']);

    const shrugPeakBlink = setGaze(cloneGrid(shrugPeak), 'shut', -1, 1);
    const shrugLower = setGaze(cloneGrid(shrugMid), 'half', 0, 1);

    clips.push(loopClip('apologetic-shrug', [
      step(shrugMid, 120),
      step(shrugPeak, 280),
      step(shrugPeakBlink, 140),
      step(shrugLower, 120),
    ]));
  }

  // 12. Cautiously checks over left and right shoulders
  {
    const lookLeft = setBrows(setGaze(withHeadOffset(-1, 0), 'left', -1, 0), 'low', -1, 0);
    const centerPass = setGaze(cloneGrid(), 'half');
    const lookRight = setBrows(withHeadOffset(1, 0), 'low', 1, 0);
    const lookLeftQuick = setGaze(withHeadOffset(-1, 0), 'left', -1, 0);

    clips.push(loopClip('look-behind', [
      step(lookLeft, 280),
      step(centerPass, 100),
      step(lookRight, 280),
      step(lookLeftQuick, 180),
    ]));
  }

  // 13. Pulls out a red blackjack rules booklet and flips a page
  {
    const raise = setGaze(cloneGrid(), 'down');
    patch(raise, 3, 17, [
      'kkkkk ',
      'krWWk ',
      'krrssk',
      'kRRSSk',
      'kkkkk ',
      ' kppk ',
    ]);

    const openRead = setBrows(setGaze(cloneGrid(), 'down'), 1);
    patch(openRead, 1, 13, [
      'kkkkkkkkk',
      'kWWtkWWrk',
      'kWtkkWtWk',
      'kWWtkWWtk',
      'krrrkrrrk',
      ' ksskkssk',
      ' kppkkppk',
    ]);

    const turnPage = setGaze(cloneGrid(), 'down');
    patch(turnPage, 1, 12, [
      '   kkk   ',
      'kkkWWtkkk',
      'kWWtkWWrk',
      'kWtWkWttk',
      'kWWtkWWtk',
      'krrrkrrrk',
      ' ksskkssk',
      ' kppkkppk',
    ]);

    const lower = cloneGrid(raise);

    clips.push(loopClip('rulebook-peek', [
      step(raise, 140),
      step(openRead, 340),
      step(turnPage, 260),
      step(lower, 130),
    ]));
  }

  // 14. Lifts blue-lanyard conference ID badge and inspects laminate glint
  {
    const lift = setGaze(cloneGrid(), 'down');
    setPx(lift, 7, 18, 'B');
    setPx(lift, 7, 19, 'b');
    patch(lift, 3, 19, [
      ' kbbk ',
      'kWWWWk',
      'kWbrWk',
      'kWttsk',
      'kkkkSk',
    ]);

    const inspect = setBrows(setGaze(cloneGrid(), 'down-left'), 1);
    setPx(inspect, 8, 15, 'b');
    setPx(inspect, 9, 15, 'B');
    patch(inspect, 3, 14, [
      '  kbk ',
      ' kyyk ',
      'kWWWWk',
      'kWbrWk',
      'kWttsk',
      'kkkkSk',
      '  kppk',
    ]);

    const glint = setGaze(cloneGrid(), 'down-left');
    setPx(glint, 8, 15, 'b');
    setPx(glint, 9, 15, 'B');
    patch(glint, 3, 14, [
      '  kbk ',
      ' kyyk ',
      'kWWyWk',
      'kWbWWk',
      'kWttsk',
      'kkkkSk',
      '  kppk',
    ]);

    const tuck = cloneGrid(lift);

    clips.push(loopClip('conference-badge', [
      step(lift, 140),
      step(inspect, 320),
      step(glint, 220),
      step(tuck, 130),
    ]));
  }

  // 15. Unfolds a wide tourist street map and tilts head to orient it
  {
    const folded = setGaze(cloneGrid(), 'down');
    patch(folded, 4, 18, [
      'kkkkk',
      'ktTtk',
      'kTbtk',
      'kssSk',
      ' kppk',
    ]);

    const unfoldLeft = setGaze(withHeadOffset(-1, 0), 'down', -1, 0);
    patch(unfoldLeft, 1, 15, [
      'kkkkkkkkkkk',
      'kttTbtTrttk',
      'ktbbTtttrtk',
      'ktTttbbTttk',
      'kkkkkkkkkkk',
      ' kssk kssk ',
      ' kppk kppk ',
    ]);

    const tiltRight = setBrows(setGaze(withHeadOffset(1, 0), 'down', 1, 0), 1, 1, 0);
    patch(tiltRight, 1, 15, [
      'kkkkkkkkkkk',
      'kttTtrTbbtk',
      'kttrTttbbtk',
      'ktTttbrTttk',
      'kkkkkkkkkkk',
      ' kssk kssk ',
      ' kppk kppk ',
    ]);

    const foldBack = cloneGrid(folded);

    clips.push(loopClip('city-map', [
      step(folded, 140),
      step(unfoldLeft, 280),
      step(tiltRight, 300),
      step(foldBack, 140),
    ]));
  }

  // 16. Huddles into fur collar and shivers rapidly with chattering teeth
  {
    const makeShiver = (dx, shut, chatter) => {
      const g = setBrows(withHeadOffset(dx, 1), 'worried', dx, 1);
      setGaze(g, shut ? 'shut' : 'half', dx, 1);
      if (chatter) patch(g, 10 + dx, 12, ['mwwm']);
      return g;
    };

    const huddle = makeShiver(0, false, false);
    const shiverLeft = makeShiver(-1, true, true);
    const shiverRight = makeShiver(1, true, true);
    const shiverLeft2 = cloneGrid(shiverLeft);
    const shiverRight2 = cloneGrid(shiverRight);
    const unhuddle = cloneGrid(huddle);

    clips.push(loopClip('parka-shiver', [
      step(huddle, 130),
      step(shiverLeft, 80),
      step(shiverRight, 80),
      step(shiverLeft2, 80),
      step(shiverRight2, 80),
      step(unhuddle, 120),
    ]));
  }

  // 17. Spots a snowflake on left shoulder and brushes it away
  {
    const snowRest = setGaze(cloneGrid(), 'down-left');
    patch(snowRest, 1, 17, ['CW', 'W ']);

    const handRaise = cloneGrid(snowRest);
    patch(handRaise, 4, 18, [
      ' kssk ',
      'kssSSk',
      ' kppk ',
    ]);

    const brushSwipe = setGaze(cloneGrid(), 'down-left');
    patch(brushSwipe, 1, 17, [
      ' kssk ',
      'kssSSk',
      ' kppk ',
    ]);
    setPx(brushSwipe, 0, 15, 'W');
    setPx(brushSwipe, 0, 16, 'c');

    const flakeDrift = setGaze(cloneGrid(), 'left');
    patch(flakeDrift, 5, 20, [
      ' kssk ',
      ' kppk ',
    ]);
    setPx(flakeDrift, 0, 14, 'c');
    setPx(flakeDrift, 0, 18, 'C');

    clips.push(loopClip('brush-snow', [
      step(snowRest, 200),
      step(handRaise, 150),
      step(brushSwipe, 180),
      step(flakeDrift, 140),
    ]));
  }

  // 18. Exhales a chilly breath mist cloud that drifts up-right and fades
  {
    const inhale = setBrows(setGaze(cloneGrid(), 'half'), -1);

    const exhale1 = setGaze(cloneGrid(), 'half');
    patch(exhale1, 11, 11, ['sks']);
    patch(exhale1, 13, 10, ['  WC', ' WWC']);

    const exhale2 = setGaze(cloneGrid(), 'half');
    patch(exhale2, 11, 11, ['sks']);
    patch(exhale2, 17, 7, [' CWW ', 'cWWWc', ' CWC ']);

    const exhale3 = cloneGrid();
    patch(exhale3, 19, 4, [' C c', 'cWC ', ' C  ']);

    const fade = cloneGrid();
    patch(fade, 21, 2, ['C ', ' c']);

    clips.push(loopClip('cold-breath', [
      step(inhale, 160),
      step(exhale1, 160),
      step(exhale2, 200),
      step(exhale3, 180),
      step(fade, 140),
    ]));
  }

  // 19. Grips both outer edges of fur collar and puffs it up
  {
    const reach = setGaze(cloneGrid(), 'half');
    patch(reach, 1, 17, [' kssk ', 'kssSSk', ' kppk ']);
    patch(reach, 17, 17, [' kssk ', 'kssSSk', ' kppk ']);

    const fluffUp = setBrows(setGaze(cloneGrid(), 'half'), -1);
    patch(fluffUp, 4, 15, ['kWkWkffffffkWkWk']);
    patch(fluffUp, 3, 16, ['kffffffffffffffffk']);
    patch(fluffUp, 2, 17, ['kfffFffffFFffffFfffk']);
    patch(fluffUp, 2, 18, ['kFFffffffffffffffFFk']);
    patch(fluffUp, 1, 16, [' kssk ', 'kssSSk', ' kppk ', ' kppk ']);
    patch(fluffUp, 17, 16, [' kssk ', 'kssSSk', ' kppk ', ' kppk ']);

    const settle = cloneGrid();
    patch(settle, 4, 16, ['kWkWkffffffkWkWk']);
    patch(settle, 1, 17, [' kssk ', 'kssSSk', ' kppk ']);
    patch(settle, 17, 17, [' kssk ', 'kssSSk', ' kppk ']);

    clips.push(loopClip('fluff-collar', [
      step(reach, 140),
      step(fluffUp, 260),
      step(settle, 180),
    ]));
  }

  // 20. Zips up his teal parka collar and zips back down
  {
    const grab = setGaze(cloneGrid(), 'down');
    patch(grab, 6, 19, [
      ' kkk  ',
      'ksssk ',
      'kppSSk',
      ' kkkkk',
    ]);

    const zipMid = setGaze(cloneGrid(), 'down');
    patch(zipMid, 9, 19, ['pPzzPp']);
    patch(zipMid, 6, 18, [
      ' kkk  ',
      'ksssk ',
      'kppSSk',
      ' kkkkk',
    ]);

    const zipUp = setGaze(cloneGrid(), 'half');
    patch(zipUp, 10, 17, ['FzzF']);
    patch(zipUp, 10, 18, ['PzzP']);
    patch(zipUp, 9, 19, ['pPzzPp']);
    patch(zipUp, 6, 16, [
      ' kkk  ',
      'ksssk ',
      'kppSSk',
      ' kkkkk',
    ]);

    const unzip = cloneGrid(zipMid);

    clips.push(loopClip('zip-parka', [
      step(grab, 140),
      step(zipMid, 130),
      step(zipUp, 280),
      step(unzip, 140),
    ]));
  }

  // 21. Curls up a hole-card corner for a timid peek and widens eyes
  {
    const holdFlat = setGaze(cloneGrid(), 'down');
    patch(holdFlat, 4, 18, [
      'kkkkkkkk',
      'kRRkRRRk',
      'kRrkRrRk',
      'kRRkRRRk',
      'ksskkssk',
      'kppkkppk',
    ]);

    const peekCorner = setGaze(cloneGrid(), 'down');
    patch(peekCorner, 4, 17, [
      'kkkkkkkk',
      'kRRkWWWk',
      'kRrkWrWk',
      'kRrkWWkk',
      'kRRkRRRk',
      'ksskkssk',
      'kppkkppk',
    ]);

    const nervousWide = setBrows(setGaze(cloneGrid(), 'wide'), -1);
    patch(nervousWide, 11, 11, ['kmk']);
    patch(nervousWide, 4, 17, [
      'kkkkkkkk',
      'kRRkWWWk',
      'kRrkWrWk',
      'kRrkWWkk',
      'kRRkRRRk',
      'ksskkssk',
      'kppkkppk',
    ]);

    const layFlat = cloneGrid(holdFlat);

    clips.push(loopClip('timid-card-peek', [
      step(holdFlat, 160),
      step(peekCorner, 280),
      step(nervousWide, 260),
      step(layFlat, 140),
    ]));
  }

  // 22. Winces and recoils at a red bust card
  {
    const badCard = setBrows(setGaze(cloneGrid(), 'wide'), -1);
    patch(badCard, 11, 11, ['kmk']);
    patch(badCard, 5, 19, [
      'kkkkkk',
      'kWWWrk',
      'kWrWrk',
      'kWWWrk',
      ' kssSk',
    ]);

    const winceTight = withHeadOffset(0, 1);
    fillRect(winceTight, 9, 7, 2, 1, 's');
    fillRect(winceTight, 13, 7, 2, 1, 's');
    fillRect(winceTight, 9, 9, 2, 1, 's');
    fillRect(winceTight, 13, 9, 2, 1, 's');
    setPx(winceTight, 9, 8, 'k');
    setPx(winceTight, 14, 8, 'k');
    setPx(winceTight, 10, 9, 'k');
    setPx(winceTight, 13, 9, 'k');
    setPx(winceTight, 9, 10, 'k');
    setPx(winceTight, 14, 10, 'k');
    patch(winceTight, 10, 12, ['mWmWm']);
    patch(winceTight, 5, 20, [
      'kkkkkk',
      'kWWWrk',
      'kWrWrk',
      ' kssSk',
    ]);

    const winceHold = cloneGrid();
    fillRect(winceHold, 9, 6, 2, 1, 's');
    fillRect(winceHold, 13, 6, 2, 1, 's');
    fillRect(winceHold, 9, 8, 2, 1, 's');
    fillRect(winceHold, 13, 8, 2, 1, 's');
    setPx(winceHold, 9, 7, 'k');
    setPx(winceHold, 14, 7, 'k');
    setPx(winceHold, 10, 8, 'k');
    setPx(winceHold, 13, 8, 'k');
    setPx(winceHold, 9, 9, 'k');
    setPx(winceHold, 14, 9, 'k');
    patch(winceHold, 10, 11, ['mWmWm']);
    patch(winceHold, 5, 21, [
      'kkkkkk',
      'kWWWrk',
      ' kssSk',
    ]);

    const sheepishBlink = setGaze(cloneGrid(), 'half');

    clips.push(loopClip('wince-bust', [
      step(badCard, 180),
      step(winceTight, 340),
      step(winceHold, 220),
      step(sheepishBlink, 140),
    ]));
  }

  // 23. Hesitates over betting a single chip and pulls it back
  {
    const liftChip = setGaze(cloneGrid(), 'down');
    patch(liftChip, 4, 17, [
      ' kkkk ',
      'krWWrk',
      'krWWrk',
      'krrssk',
      ' kSSSk',
      ' kpppk',
    ]);

    const hesitateOut = setBrows(setGaze(cloneGrid(), 'left'), 1);
    patch(hesitateOut, 2, 16, [
      ' kkkk ',
      'krWWrk',
      'krWWrk',
      'krrssk',
      ' kSSSk',
      ' kpppk',
    ]);

    const pullBack = setGaze(cloneGrid(), 'down');
    patch(pullBack, 11, 11, ['kmk']);
    patch(pullBack, 5, 17, [
      ' kkkk ',
      'krWWrk',
      'krWWrk',
      'krrssk',
      ' kSSSk',
      ' kpppk',
    ]);

    const setDown = setGaze(cloneGrid(), 'half');
    patch(setDown, 5, 20, [
      ' kkkk ',
      'krWWrk',
      'krrssk',
      ' kSSSk',
    ]);

    clips.push(loopClip('hesitant-chip', [
      step(liftChip, 150),
      step(hesitateOut, 280),
      step(pullBack, 260),
      step(setDown, 140),
    ]));
  }

  // 24. Warms hands around a steaming hot paper cocoa cup
  {
    const liftCup = setGaze(cloneGrid(), 'down');
    patch(liftCup, 7, 17, [
      ' kkkkk ',
      'kWtttwk',
      'ksTTtsk',
      'ksTTtsk',
      ' kSSSk ',
      ' kkkkk ',
    ]);

    const warmHold = setGaze(cloneGrid(), 'half');
    patch(warmHold, 7, 15, [
      ' koook ',
      'kWtttwk',
      'ksTTtsk',
      'ksTTtsk',
      ' kSSSk ',
      ' kkkkk ',
    ]);
    patch(warmHold, 5, 13, [' C', 'W ']);
    patch(warmHold, 17, 13, ['C ', ' W']);

    const steamRise = setGaze(cloneGrid(), 'shut');
    patch(steamRise, 7, 14, [
      ' koook ',
      'kWtttwk',
      'ksTTtsk',
      'ksTTtsk',
      ' kSSSk ',
      ' kkkkk ',
    ]);
    patch(steamRise, 4, 10, ['c ', ' W', 'C ']);
    patch(steamRise, 18, 10, [' c', 'W ', ' C']);

    const lowerCup = cloneGrid(liftCup);

    clips.push(loopClip('warm-cup', [
      step(liftCup, 150),
      step(warmHold, 260),
      step(steamRise, 260),
      step(lowerCup, 150),
    ]));
  }

  return clips;
}

compileAnimations({
  name: 'Genly Ai',
  scriptRelPath: 'scripts/build-genly-ai-animations.mjs',
  exportName: 'GENLY_AI_ANIMATIONS',
  outPath: OUT_PATH,
  outRelPath: 'src/assets/portraits/genly-ai-animations.ts',
  palette: PALETTE,
  baseGrid: BASE_GRID,
  clips: buildClips(),
  previewDir: getPreviewDir(),
});
