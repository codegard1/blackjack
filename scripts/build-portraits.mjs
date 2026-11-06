// Builds the character portraits in src/assets/portraits from the pixel maps below.
// Run with `npm run portraits` after editing a map.
//
// Each portrait is a 24x24 grid. A row of 12 characters is mirrored to make the full
// row (for symmetric parts); a row of 24 characters is used as written. Every
// character in a row must appear in that portrait's palette.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 24;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'portraits');

/** @type {{ id: string, palette: Record<string, string>, rows: string[], overlay?: [number, number, string][] }[]} */
const PORTRAITS = [
  {
    // The Rock: bald crown, grey fringe and long beard, closed eyes, brown travelling cloak
    id: 'ogion',
    palette: {
      '.': '#5b7046', k: '#1e1a17', s: '#d9a77c', S: '#b8835c',
      g: '#d4d1c8', G: '#9e9a90', c: '#6b4a2f', C: '#4a3220', t: '#a89a7a',
    },
    rows: [
      '............',
      '............',
      '.........kkk',
      '........ksss',
      '.......kssss',
      '......kgssss',
      '......kgsggs',
      '......kgskks',
      '......kgssss',
      '......kgsssS',
      '......kgsggg',
      '......kggggG',
      '......kggggg',
      '.......kgggg',
      '.......kgggg',
      '...kkkkkkggg',
      '..kccccccGgg',
      '.kcccccccGgg',
      '.kCcccccccGg',
      'kCcccccccccg',
      'kCccccccccct',
      'kCcccccccCtt',
      'kCccccccCttt',
      'kCccccccCttt',
    ],
  },
  {
    // The Shark: lean long face, untidy dark hair, a half smile, plain undyed shirt
    id: 'shevek',
    palette: {
      '.': '#4a6283', k: '#1b1c22', e: '#1b1c22', s: '#e2b48d', S: '#c48f68',
      h: '#3d2b1f', H: '#5c4330', m: '#7d4436', c: '#b9b1a0', C: '#8f8878',
    },
    rows: [
      '........................',
      '..........kk.kk.........',
      '.........khhkhhkk.......',
      '........khhhhhhhhk......',
      '.......khhhhhhhhhhk.....',
      '......khhhhhhhhhhhk.....',
      '......khhssshhhshhk.....',
      '......khsssssssshhk.....',
      '......khssessesshhk.....',
      '......khsssSSsssShk.....',
      '......khsssssssshk......',
      '.......ksssssmssk.......',
      '.......kssmmmsssk.......',
      '.......kssssssssk.......',
      '........kssssssk........',
      '.........kSSSSk.........',
      '..........kssk..........',
      '.....kkkkcSs',
      '...kkcccccCs',
      '..kcccccccCC',
      '.kcccccccccc',
      '.kCccccccccc',
      'kCcccccccccc',
      'kCcccccccccc',
    ],
  },
  {
    // The Maniac: big head, red-brown beard, wide toothy grin, suit and red tie
    id: 'haber',
    palette: {
      '.': '#d98a4e', k: '#1f1512', e: '#1f1512', s: '#f0bf9a', S: '#d79d78', r: '#8a3a1c', R: '#6b2a12',
      w: '#f4f1ea', j: '#4b4560', J: '#33304a', t: '#b3202a',
    },
    rows: [
      '............',
      '............',
      '........kkkk',
      '......kkrrrr',
      '.....krrrrrr',
      '.....krsssss',
      '.....krsssss',
      '.....krsRRRs',
      '....kSrssess',
      '....kSrssssS',
      '.....krsssss',
      '.....krrsrrr',
      '.....krrkwww',
      '.....krrrkkk',
      '.....krrrrrr',
      '......krrrrr',
      '.......kRrrr',
      '..kkkkkkkRrr',
      '.kjjjjjjjkRR',
      'kjjjjjjjjwwt',
      'kjjjjjjjJwwt',
      'kjjjjjjjJwtt',
      'kjjjjjjjjJwt',
      'kjjjjjjjjjJt',
    ],
  },
  {
    // The Tourist: raised eyebrows, eyes glancing sideways, fur-collared parka, camera
    id: 'genly-ai',
    palette: {
      '.': '#a9c6d6', k: '#17110e', e: '#17110e', s: '#7a4a2e', S: '#5e3721', h: '#1a1412',
      w: '#f2ece2', m: '#3f1f12', f: '#efe6d2', F: '#cbbfa5', p: '#2f6f73', P: '#22504f',
      z: '#1c2a2a', g: '#d3d8dc', L: '#2b2b2b',
    },
    rows: [
      '............',
      '............',
      '.........kkk',
      '........khhh',
      '.......khhhh',
      '.......khhss',
      '.......kshhs',
      '.......kssss',
      '.......kswesswesk.......',
      '.......ksssS',
      '.......kssss',
      '.......ksssmmmssk.......',
      '.......kssss',
      '........ksss',
      '.........kkk',
      '..........kS',
      '....kfkfkfff',
      '...kffffffff',
      '..kfffFffffF',
      '.kppFFFFFFFF',
      'kppppppppppz',
      'kPppppppppPz',
      'kPppppppppPz',
      'kPppppppppPz',
    ],
    overlay: [
      // camera on a strap: light body, dark two-by-two lens
      [15, 20, 'k'],
      [14, 21, 'g'], [15, 21, 'g'], [16, 21, 'g'], [17, 21, 'g'],
      [14, 22, 'g'], [15, 22, 'L'], [16, 22, 'L'], [17, 22, 'g'],
      [14, 23, 'g'], [15, 23, 'L'], [16, 23, 'L'], [17, 23, 'g'],
    ],
  },
  {
    // The House: long straight black hair, gold circlet, pale clear eyes, robe with a gold medallion
    id: 'faxe',
    palette: {
      '.': '#2f5d4a', k: '#121014', h: '#1d1a24', H: '#3a3446', s: '#b07d56', S: '#8f5f3d',
      y: '#d9ad3a', Y: '#a87d1c', i: '#cfe6ef', m: '#7a4532', c: '#e8e1d0', C: '#c2b9a5',
    },
    rows: [
      '............',
      '.........kkk',
      '........khhh',
      '.......khhhh',
      '......khhhhh',
      '......khyyyy',
      '......khssss',
      '......khssss',
      '......khssis',
      '......khsssS',
      '......khssss',
      '......khsssm',
      '......khssss',
      '......khhsss',
      '.....khhhkkk',
      '.....khhhhkS',
      '....khhhhhks',
      '..kkhhhhhycc',
      '.kcchhhhhcyc',
      '.kcchhhhcCyy',
      'kccchhhhcCyY',
      'kccchhhcccyy',
      'kCccchhcccCc',
      'kCcccccccccc',
    ],
  },
];

/** Expand mirrored half rows and apply overlays, checking every row and character. */
function toGrid({ id, palette, rows, overlay = [] }) {
  if (rows.length !== SIZE) throw new Error(`${id}: expected ${SIZE} rows, got ${rows.length}`);
  const grid = rows.map((row, y) => {
    const full = row.length === SIZE / 2 ? row + [...row].reverse().join('') : row;
    if (full.length !== SIZE) throw new Error(`${id}: row ${y} has ${row.length} characters`);
    for (const ch of full) if (!(ch in palette)) throw new Error(`${id}: row ${y} uses '${ch}', which is not in the palette`);
    return [...full];
  });
  for (const [x, y, ch] of overlay) {
    if (!(ch in palette)) throw new Error(`${id}: overlay uses '${ch}', which is not in the palette`);
    grid[y][x] = ch;
  }
  return grid;
}

/** One rect per horizontal run of a colour, over a full-size background rect. */
function toSvg(portrait) {
  const grid = toGrid(portrait);
  const rects = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < SIZE) {
      const ch = row[x];
      let end = x + 1;
      while (end < SIZE && row[end] === ch) end++;
      if (ch !== '.') rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${portrait.palette[ch]}"/>`);
      x = end;
    }
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">`,
    `<rect width="${SIZE}" height="${SIZE}" fill="${portrait.palette['.']}"/>`,
    ...rects,
    '</svg>',
    '',
  ].join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });
for (const portrait of PORTRAITS) {
  writeFileSync(join(OUT_DIR, `${portrait.id}.svg`), toSvg(portrait));
  console.log(`wrote ${portrait.id}.svg`);
}
