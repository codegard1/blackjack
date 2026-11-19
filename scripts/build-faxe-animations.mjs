// Builds the lazy-loaded pixel-art animations for Faxe (the Dealer) in
// src/assets/portraits/faxe-animations.ts using a compact delta-RLE binary format.
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

const FAXE_SVG_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'faxe.svg');
const OUT_PATH = join(ROOT_DIR, 'src', 'assets', 'portraits', 'faxe-animations.ts');

const PALETTE = {
  '.': '#2f5d4a', // emerald felt background
  k: '#121014', // outline / deep black
  h: '#1d1a24', // long black hair
  H: '#3a3446', // hair highlight sheen
  s: '#b07d56', // skin
  S: '#8f5f3d', // skin shadow / nose / eyelid shade
  y: '#d9ad3a', // gold circlet & medallion
  Y: '#a87d1c', // gold shadow
  i: '#cfe6ef', // pale clear eyes
  m: '#7a4532', // calm mouth
  c: '#e8e1d0', // cream robe / card face
  C: '#c2b9a5', // robe shadow
  W: '#ffffff', // pure white (cards, sparkle, nail glint, eye flash)
  g: '#fff099', // bright gold highlight / note / flare
  I: '#8ad2f0', // ice-blue mystic eye aura
  b: '#5aa5c8', // deep ice blue
  r: '#c72c38', // crimson card pip / detail
  R: '#8c1d27', // deep crimson card back
  a: '#d4c8b0', // sand / teacup porcelain
  p: '#e5a49b', // nail sheen / soft highlight
  v: '#8b6bb5', // mystic lavender shimmer
  l: '#a5b5c0', // silver mist / steam / dust mote
  L: '#6d7f8a', // slate fade
  t: '#4a2c1d', // dark brewed tea
};

const BASE_GRID = loadBaseGridFromSvg(FAXE_SVG_PATH, PALETTE);

// ---------------------------------------------------------------------------
// Pixel grid composition helpers
// ---------------------------------------------------------------------------

function cloneGrid(grid = BASE_GRID) {
  return cloneBaseGrid(grid);
}

function loopClip(id, middleSteps, startMs = 90, endMs = 90) {
  return buildLoopClip(BASE_GRID, id, middleSteps, startMs, endMs);
}

/** Shifts Faxe's head & upper hair (y=1..14) while keeping shoulders, robe, and medallion anchored. */
function withHeadOffset(dx, dy) {
  const out = cloneGrid();
  if (dx === 0 && dy === 0) return out;

  for (let y = 0; y <= 14; y++) {
    for (let x = 0; x < SIZE; x++) {
      out[y][x] = '.';
    }
  }
  // Keep neck and cascading hair bridges connected behind the jaw when head lifts or tilts
  patch(out, 5, 14, ['khhhhhSShhhhhk']);

  for (let y = 0; y <= 14; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (BASE_GRID[y][x] !== '.') {
        setPx(out, x + dx, y + dy, BASE_GRID[y][x]);
      }
    }
  }
  return out;
}

/** Adjusts Faxe's pale clear eyes around shifted head origin `(10 + dx, 8 + dy)` and `(13 + dx, 8 + dy)`. */
function setEyeMode(grid, mode, dx = 0, dy = 0) {
  const lx = 10 + dx;
  const rx = 13 + dx;
  const ey = 8 + dy;

  if (mode === 'left') {
    patch(grid, lx - 1, ey, ['is']);
    patch(grid, rx - 1, ey, ['is']);
  } else if (mode === 'right') {
    patch(grid, lx, ey, ['si']);
    patch(grid, rx, ey, ['si']);
  } else if (mode === 'down') {
    patch(grid, lx, ey, ['S', 'i']);
    patch(grid, rx, ey, ['S', 'i']);
  } else if (mode === 'down-left') {
    patch(grid, lx - 1, ey, ['sS', 'i ']);
    patch(grid, rx - 1, ey, ['sS', 'i ']);
  } else if (mode === 'up-right') {
    patch(grid, lx, ey - 1, [' i', 's ']);
    patch(grid, rx, ey - 1, [' i', 's ']);
  } else if (mode === 'half') {
    setPx(grid, lx, ey, 'S');
    setPx(grid, rx, ey, 'S');
  } else if (mode === 'shut') {
    patch(grid, lx - 1, ey, ['kk']);
    patch(grid, rx, ey, ['kk']);
  } else if (mode === 'glow') {
    patch(grid, lx - 1, ey, ['IWI']);
    patch(grid, rx - 1, ey, ['IWI']);
    setPx(grid, lx, ey - 1, 'I');
    setPx(grid, rx, ey - 1, 'I');
  } else if (mode === 'wide') {
    patch(grid, lx - 1, ey, ['Wi']);
    patch(grid, rx, ey, ['iW']);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// 24 Loopable Faxe Animations
// ---------------------------------------------------------------------------

function buildClips() {
  const clips = [];

  // 1. Toss hair and smirk (requested)
  {
    const windup = withHeadOffset(-1, 0);
    setEyeMode(windup, 'left', -1, 0);

    const tossMid = withHeadOffset(1, 0);
    setEyeMode(tossMid, 'right', 1, 0);
    // Left hair lifts away from left shoulder, exposing clean outlined cream robe; right hair billows outward
    patch(tossMid, 2, 16, ['.......', 'kkkkkkk', 'cccccch', 'cccccch', 'cccccch']);
    patch(tossMid, 16, 4, ['hhhhk  ', 'hHhhhk ', 'hhHhhhk', 'hHhhhk ', 'hhhhk  ']);
    patch(tossMid, 16, 13, ['hhhhhk ', 'hHhhhhk', 'hhHhhhk', 'hhhhhk ', 'hhhhk  ']);

    const tossPeak = withHeadOffset(1, 0);
    setEyeMode(tossPeak, 'half', 1, 0);
    setPx(tossPeak, 11, 8, 'i'); // left eye open, slight confident squint on right
    patch(tossPeak, 13, 6, ['kkk']); // raised smirk brow over shifted right eye
    setPx(tossPeak, 14, 10, 'm'); // subtle asymmetric smirk
    patch(tossPeak, 2, 15, ['.......', '.......', 'kkkkkkk', 'ccccccc', 'ccccccC', 'ccccccC', 'ccccccc', 'ccccccc']);
    patch(tossPeak, 16, 4, ['hhHhhk ', 'hhhHhhk', 'hhHhhhk', 'hhhhhhk', 'hhhhhk ']);
    patch(tossPeak, 16, 12, ['hhHhhhk', 'hhhHhhk', 'hhhhhhk', 'hhhhhk ', 'hhhhk  ']);

    const settle = cloneGrid();
    setPx(settle, 13, 10, 'm');
    patch(settle, 17, 5, ['hk', 'hk', 'hk']);
    patch(settle, 18, 13, ['hk', 'hk', 'hk']);

    clips.push(loopClip('hair-toss', [
      step(windup, 120),
      step(tossMid, 120),
      step(tossPeak, 340),
      step(settle, 130),
    ]));
  }

  // 2. Examine nails (requested)
  {
    const handRaise = setEyeMode(cloneGrid(), 'down');
    patch(handRaise, 16, 17, [
      ' kpk  ',
      'ksssk ',
      'ksSSk ',
      'kccck ',
      'kCCck ',
    ]);

    const inspect = setEyeMode(cloneGrid(), 'down');
    patch(inspect, 15, 14, [
      ' kpkpk ',
      'kspsssk',
      'kssssSk',
      ' kSSSk ',
      ' kccck ',
      ' kccck ',
    ]);

    const sparkle = cloneGrid(inspect);
    patch(sparkle, 15, 13, [
      '  W    ',
      ' WpW   ',
      '  W    ',
    ]);

    const inspect2 = setEyeMode(cloneGrid(inspect), 'half');

    clips.push(loopClip('examine-nails', [
      step(handRaise, 130),
      step(inspect, 320),
      step(sparkle, 220),
      step(inspect2, 180),
      step(handRaise, 130),
    ]));
  }

  // 3. Adjust headdress (requested)
  {
    const reach = cloneGrid();
    patch(reach, 4, 9, [' ksk ', 'kssSk', 'kcck ', 'kcck ']);
    patch(reach, 15, 9, [' ksk ', 'kSssk', ' kcck', ' kcck']);

    const tilt = cloneGrid();
    patch(tilt, 8, 5, ['hhyyyyyy']);
    setPx(tilt, 8, 6, 'y');
    setPx(tilt, 9, 6, 'y');
    patch(tilt, 4, 4, [' ksk ', 'kssSk', 'kcck ', 'kcck ']);
    patch(tilt, 15, 4, [' ksk ', 'kSssk', ' kcck', ' kcck']);

    const level = cloneGrid();
    patch(level, 4, 4, [' ksk ', 'kssSk', 'kcck ', 'kcck ']);
    patch(level, 15, 4, [' ksk ', 'kSssk', ' kcck', ' kcck']);
    patch(level, 10, 5, ['gWWg']);

    const sheen = cloneGrid();
    patch(sheen, 4, 7, [' ksk ', 'kssSk', 'kcck ']);
    patch(sheen, 15, 7, [' ksk ', 'kSssk', ' kcck']);
    patch(sheen, 12, 5, ['gWg']);

    clips.push(loopClip('adjust-headdress', [
      step(reach, 130),
      step(tilt, 180),
      step(level, 260),
      step(sheen, 160),
      step(reach, 120),
    ]));
  }

  // 4. Wink (requested)
  {
    const half = cloneGrid();
    setPx(half, 13, 8, 'S');

    const wink = cloneGrid();
    patch(wink, 9, 6, ['kk']); // subtle left brow arch
    setPx(wink, 10, 8, 'W'); // crisp sparkle in left pale eye
    patch(wink, 13, 8, ['kk']); // closed right eyelid
    setPx(wink, 13, 10, 'm'); // subtle knowing smirk

    clips.push(loopClip('wink', [
      step(half, 70),
      step(wink, 380),
      step(half, 70),
    ]));
  }

  // 5. Whistle (requested)
  {
    const pucker = setEyeMode(cloneGrid(), 'up-right');
    patch(pucker, 11, 11, ['ks']);

    const note1 = cloneGrid(pucker);
    patch(note1, 17, 7, [
      ' gg',
      ' g ',
      'gg ',
    ]);

    const note2 = cloneGrid(pucker);
    patch(note2, 19, 3, [
      ' gg',
      ' g ',
      'gg ',
    ]);
    patch(note2, 16, 9, [
      ' i ',
      'ii ',
    ]);

    const note3 = cloneGrid(pucker);
    patch(note3, 21, 1, [
      ' ll',
      ' l ',
    ]);
    patch(note3, 18, 5, [
      ' WW',
      ' W ',
      'WW ',
    ]);

    const fade = cloneGrid();
    patch(fade, 20, 2, [
      ' l ',
      'l  ',
    ]);

    clips.push(loopClip('whistle', [
      step(pucker, 160),
      step(note1, 220),
      step(note2, 240),
      step(note3, 240),
      step(fade, 160),
    ]));
  }

  // 6. Deal a card smoothly
  {
    const prep = setEyeMode(cloneGrid(), 'down');
    patch(prep, 16, 18, [
      'kkkkk',
      'kWWWrk',
      'kWWWWk',
      'kssssk',
    ]);

    const slideMid = setEyeMode(cloneGrid(), 'down');
    patch(slideMid, 10, 17, [
      'kkkkk',
      'kWrWWk',
      'kWWWWk',
      'kkkkk',
    ]);
    patch(slideMid, 17, 19, ['kssk', 'kcck']);

    const slideLeft = setEyeMode(cloneGrid(), 'down-left');
    patch(slideLeft, 3, 18, [
      'kkkkk',
      'kWWWrk',
      'kWWWWk',
      'kkkkk',
    ]);

    const settle = setEyeMode(cloneGrid(), 'left');
    patch(settle, 1, 19, [
      'kkkk',
      'kWWk',
      'kkkk',
    ]);

    clips.push(loopClip('deal-card', [
      step(prep, 140),
      step(slideMid, 130),
      step(slideLeft, 150),
      step(settle, 150),
    ]));
  }

  // 7. Fan three cards cleanly
  {
    const raise = setEyeMode(cloneGrid(), 'down');
    patch(raise, 9, 18, [
      'kkkkkk',
      'kWWWWk',
      'kWWWrk',
      'kssSsk',
      ' kcck ',
    ]);

    const fan = setEyeMode(cloneGrid(), 'down');
    patch(fan, 6, 15, [
      'kkkkkkkkkkkk',
      'kWrWkWWkWkWk',
      'kWWWkWWkWWWk',
      'kWWWkWWkWWrk',
      'kssskWWksssk',
      ' kSSkSSkSSk ',
      ' kcckcckcck ',
    ]);

    const fanGlint = cloneGrid(fan);
    patch(fanGlint, 15, 14, [' g ', 'gWg', ' g ']);

    clips.push(loopClip('fan-cards', [
      step(raise, 130),
      step(fan, 340),
      step(fanGlint, 220),
      step(raise, 130),
    ]));
  }

  // 8. Riffle shuffle at the bottom edge
  {
    const hold = setEyeMode(cloneGrid(), 'down');
    patch(hold, 6, 17, [
      'kkkk   kkkk',
      'kWWk   kWWk',
      'kWWk   kWWk',
      'kssk   kssk',
      'kcck   kcck',
    ]);

    const bridge1 = setEyeMode(cloneGrid(), 'down');
    patch(bridge1, 6, 16, [
      'kkkkkkkkkkk',
      'kWWkRRRkkWk',
      'kWWWRRRWWWk',
      'kssskkksssk',
      'kcck   kcck',
    ]);

    const bridge2 = setEyeMode(cloneGrid(), 'down');
    patch(bridge2, 7, 16, [
      ' kkkkkkkkk ',
      'kWWRWWRWWk ',
      'kWWWRRWWWk ',
      ' ksssksssk ',
      ' kcck kcck ',
    ]);

    const square = setEyeMode(cloneGrid(), 'down');
    patch(square, 9, 17, [
      'kkkkkk',
      'kWWWWk',
      'kRRRRk',
      'kssssk',
    ]);

    clips.push(loopClip('riffle-shuffle', [
      step(hold, 140),
      step(bridge1, 150),
      step(bridge2, 150),
      step(bridge1, 140),
      step(square, 180),
    ]));
  }

  // 9. Gold medallion gleam
  {
    const g1 = cloneGrid();
    patch(g1, 10, 19, ['gW']);

    const g2 = cloneGrid();
    setPx(g2, 10, 8, 'W');
    setPx(g2, 13, 8, 'W');
    patch(g2, 9, 17, [
      '  g   ',
      ' gWg  ',
      'gWWWg ',
      ' gWg  ',
      '  g   ',
    ]);

    const g3 = cloneGrid();
    patch(g3, 12, 20, ['Wg', 'gW']);

    clips.push(loopClip('medallion-gleam', [
      step(g1, 110),
      step(g2, 220),
      step(g3, 120),
    ]));
  }

  // 10. Omniscient pale eye glow
  {
    const dimGlow = cloneGrid();
    patch(dimGlow, 10, 8, ['W']);
    patch(dimGlow, 13, 8, ['W']);
    setPx(dimGlow, 11, 5, 'g');
    setPx(dimGlow, 12, 5, 'g');

    const fullGlow = setEyeMode(cloneGrid(), 'glow');
    patch(fullGlow, 11, 5, ['WW']);

    clips.push(loopClip('eye-glow', [
      step(dimGlow, 140),
      step(fullGlow, 340),
      step(dimGlow, 140),
    ]));
  }

  // 11. Serene slow blink
  {
    const half = setEyeMode(cloneGrid(), 'half');
    const shut = setEyeMode(cloneGrid(), 'shut');

    clips.push(loopClip('slow-blink', [
      step(half, 90),
      step(shut, 340),
      step(half, 90),
    ]));
  }

  // 12. Knowing dignified nod
  {
    const nod = withHeadOffset(0, 1);
    setPx(nod, 10, 9, 'S');
    setPx(nod, 13, 9, 'S');

    const nodDeep = withHeadOffset(0, 1);
    patch(nodDeep, 9, 9, ['kk']);
    patch(nodDeep, 13, 9, ['kk']);

    clips.push(loopClip('knowing-nod', [
      step(nod, 110),
      step(nodDeep, 240),
      step(nod, 110),
    ]));
  }

  // 13. Side-eye glance
  {
    const glance = setEyeMode(cloneGrid(), 'left');
    patch(glance, 9, 7, ['kk']);
    patch(glance, 12, 7, ['kk']);

    const glanceHold = cloneGrid(glance);
    setPx(glanceHold, 9, 8, 'W');
    setPx(glanceHold, 12, 8, 'W');

    clips.push(loopClip('side-eye', [
      step(glance, 240),
      step(glanceHold, 260),
      step(glance, 180),
    ]));
  }

  // 14. Raised skeptical eyebrow
  {
    const arch = cloneGrid();
    patch(arch, 12, 6, ['kkk']);
    setPx(arch, 13, 8, 'W');
    patch(arch, 11, 11, ['sm']);

    const archHold = cloneGrid(arch);
    setPx(archHold, 14, 7, 'k');

    clips.push(loopClip('raised-eyebrow', [
      step(arch, 200),
      step(archHold, 300),
      step(arch, 140),
    ]));
  }

  // 15. Graceful tea sip
  {
    const lift = setEyeMode(cloneGrid(), 'down');
    patch(lift, 14, 15, [
      '  W   ',
      ' l    ',
      'ktttk ',
      'kaaayk',
      ' kaak ',
      ' kssk ',
      ' kcck ',
    ]);

    const sip = setEyeMode(cloneGrid(), 'shut');
    patch(sip, 10, 11, [
      'ktttk ',
      'kaaayk',
      ' kaak ',
      ' kssk ',
      ' kcck ',
    ]);

    const lower = setEyeMode(cloneGrid(), 'half');
    patch(lower, 15, 17, [
      'ktttk',
      'kaaak',
      ' kaak',
      ' kssk',
    ]);

    clips.push(loopClip('tea-sip', [
      step(lift, 180),
      step(sip, 380),
      step(lower, 160),
    ]));
  }

  // 16. Roll gold coin across knuckles
  {
    const handBase = [
      ' ksssk ',
      'kssSSSk',
      ' kccck ',
    ];

    const c1 = setEyeMode(cloneGrid(), 'down');
    patch(c1, 14, 17, handBase);
    patch(c1, 14, 15, [' ky ', 'ygWy', ' Yy ']);

    const c2 = setEyeMode(cloneGrid(), 'down');
    patch(c2, 14, 17, handBase);
    patch(c2, 16, 15, [' ky ', 'yWgy', ' Yy ']);

    const c3 = setEyeMode(cloneGrid(), 'down');
    patch(c3, 14, 17, handBase);
    patch(c3, 18, 15, [' ky ', 'ygWy', ' Yy ']);

    clips.push(loopClip('flip-gold-coin', [
      step(c1, 140),
      step(c2, 140),
      step(c3, 160),
      step(c2, 140),
      step(c1, 140),
    ]));
  }

  // 17. Calm meditative hover
  {
    const baseFloat = shiftGrid(BASE_GRID, 0, -1, '.');
    patch(baseFloat, 0, 23, ['kCccccccccccccccccccccCk']);
    setEyeMode(baseFloat, 'shut', 0, -1);

    const float1 = cloneGrid(baseFloat);
    setPx(float1, 2, 12, 'I');
    setPx(float1, 21, 13, 'g');

    const float2 = cloneGrid(baseFloat);
    setPx(float2, 2, 9, 'g');
    setPx(float2, 3, 11, 'I');
    setPx(float2, 21, 10, 'I');
    setPx(float2, 20, 12, 'g');

    const float3 = cloneGrid(baseFloat);
    setPx(float3, 2, 7, 'l');
    setPx(float3, 21, 8, 'l');

    const settle = setEyeMode(cloneGrid(), 'half');

    clips.push(loopClip('meditate-float', [
      step(settle, 120),
      step(float1, 240),
      step(float2, 300),
      step(float3, 240),
      step(settle, 120),
    ]));
  }

  // 18. Mystic crystal vision glint
  {
    const spark = setEyeMode(cloneGrid(), 'up-right');
    patch(spark, 19, 4, [' I ', 'IWI', ' I ']);

    const vision = setEyeMode(cloneGrid(), 'glow');
    patch(vision, 18, 2, [
      '  W  ',
      ' vIv ',
      'IWWWI',
      ' vIv ',
      '  W  ',
    ]);

    const fade = setEyeMode(cloneGrid(), 'right');
    patch(fade, 19, 3, ['l .', '. l']);

    clips.push(loopClip('crystal-glint', [
      step(spark, 160),
      step(vision, 360),
      step(fade, 160),
    ]));
  }

  // 19. Folding hand fan
  {
    const closed = setEyeMode(cloneGrid(), 'half');
    patch(closed, 17, 16, [
      ' kck ',
      'kcYyk',
      ' ksk ',
      ' kck ',
    ]);

    const open1 = cloneGrid();
    patch(open1, 14, 13, [
      ' kkkkkkk ',
      'kWcWcWcWk',
      'kcYcYcYck',
      ' kyyyyyk ',
      '  ksssk  ',
      '   kcck  ',
    ]);

    const open2 = cloneGrid(open1);
    // Gentle breeze flutters right hair strand 1px
    patch(open2, 16, 10, ['k.', 'hk', 'hk']);
    patch(open2, 14, 13, [
      ' kkkkkkk ',
      'kcWcWcWck',
      'kCYcYcYCk',
      ' kygygyk ',
      '  ksssk  ',
      '   kcck  ',
    ]);

    clips.push(loopClip('hand-fan', [
      step(closed, 120),
      step(open1, 200),
      step(open2, 200),
      step(open1, 200),
      step(open2, 180),
      step(closed, 120),
    ]));
  }

  // 20. Quiet appraising head tilt
  {
    const left = withHeadOffset(-1, 0);
    setEyeMode(left, 'right', -1, 0);

    const right = withHeadOffset(1, 0);
    setEyeMode(right, 'left', 1, 0);

    clips.push(loopClip('head-tilt', [
      step(left, 320),
      step(cloneGrid(), 120),
      step(right, 320),
    ]));
  }

  // 21. Brush dust off left shoulder
  {
    const dust = setEyeMode(cloneGrid(), 'down-left');
    patch(dust, 2, 17, ['l', 'W']);

    const brush1 = setEyeMode(cloneGrid(), 'down-left');
    patch(brush1, 2, 17, ['l', 'W']);
    patch(brush1, 4, 17, ['ksssk', 'kccck']);

    const brush2 = setEyeMode(cloneGrid(), 'down-left');
    patch(brush2, 1, 17, ['ksssk', 'kccck']);
    setPx(brush2, 0, 16, 'l');

    const brush3 = setEyeMode(cloneGrid(), 'half');
    patch(brush3, 6, 19, ['kssk', 'kcck']);

    clips.push(loopClip('brush-shoulder', [
      step(dust, 180),
      step(brush1, 160),
      step(brush2, 180),
      step(brush3, 140),
    ]));
  }

  // 22. Check golden hourglass ("the house is patient")
  {
    const hg1 = setEyeMode(cloneGrid(), 'down');
    patch(hg1, 17, 13, [
      'kyyyk',
      'kiayk',
      ' kia ',
      'kiiik',
      'kyyyk',
      'ksssk',
      ' kcck',
    ]);

    const hg2 = setEyeMode(cloneGrid(), 'down');
    patch(hg2, 17, 13, [
      'kyyyk',
      'kiaik',
      ' kyk ',
      'kiyak',
      'kyyyk',
      'ksssk',
      ' kcck',
    ]);

    const hg3 = setEyeMode(cloneGrid(), 'half');
    patch(hg3, 17, 13, [
      'kyyyk',
      'kiiik',
      ' kik ',
      'kyaak',
      'kyyyk',
      'ksssk',
      ' kcck',
    ]);

    clips.push(loopClip('hourglass-check', [
      step(hg1, 220),
      step(hg2, 240),
      step(hg3, 280),
    ]));
  }

  // 23. Quiet "shh" finger to lips
  {
    const rise = setEyeMode(cloneGrid(), 'half');
    patch(rise, 10, 15, [
      ' kp  ',
      ' ksk ',
      'kssSk',
      'kccck',
    ]);

    const shh = setEyeMode(cloneGrid(), 'half');
    patch(shh, 10, 10, [
      ' kp  ',
      ' ksS ',
      ' ksS ',
      ' ksS ',
      'kssSk',
      'kccck',
    ]);

    clips.push(loopClip('shh-finger', [
      step(rise, 130),
      step(shh, 420),
      step(rise, 130),
    ]));
  }

  // 24. Peek at the dealer's hole card
  {
    const cardFlat = setEyeMode(cloneGrid(), 'down');
    patch(cardFlat, 14, 17, [
      'kkkkkkk',
      'kRRRRRk',
      'kRyRyRk',
      'kRRRRRk',
      ' ksssk ',
      '  kcck ',
    ]);

    const peekCorner = setEyeMode(cloneGrid(), 'down');
    patch(peekCorner, 14, 16, [
      'kkkkkkk',
      'kWWWRRk',
      'kWrWRRk',
      'kRRRRRk',
      ' ksssk ',
      '  kcck ',
    ]);

    const smirk = cloneGrid(peekCorner);
    setEyeMode(smirk, 'half');
    setPx(smirk, 13, 10, 'm');

    clips.push(loopClip('peek-hole-card', [
      step(cardFlat, 160),
      step(peekCorner, 260),
      step(smirk, 260),
      step(cardFlat, 140),
    ]));
  }

  return clips;
}

compileAnimations({
  name: 'Faxe',
  scriptRelPath: 'scripts/build-faxe-animations.mjs',
  exportName: 'FAXE_ANIMATIONS',
  outPath: OUT_PATH,
  outRelPath: 'src/assets/portraits/faxe-animations.ts',
  palette: PALETTE,
  baseGrid: BASE_GRID,
  clips: buildClips(),
  previewDir: getPreviewDir(),
});
