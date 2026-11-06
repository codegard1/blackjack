// Simulates a long play history for the five characters by running real games in
// quick succession, then saves their stats to src/data/characterHistory.json, which
// the app adds to each character's record.
//
//   npm run simulate-history                      10,000 rounds, seed 1
//   npm run simulate-history -- --rounds 20000 --seed 7
//   npm run simulate-history -- --rounds 300 --out ./history.json
//
// The game code is TypeScript (with enums and asset imports), so it is loaded
// through Vite rather than run by Node directly.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { values } = parseArgs({
  options: {
    rounds: { type: 'string', default: '10000' },
    seed: { type: 'string', default: '1' },
    out: { type: 'string', default: 'src/data/characterHistory.json' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log('Usage: npm run simulate-history -- [--rounds N] [--seed N] [--out path]');
  process.exit(0);
}

const rounds = Number(values.rounds);
const seed = Number(values.seed);
if (!Number.isInteger(rounds) || rounds < 1) throw new Error(`--rounds must be a whole number above 0, not "${values.rounds}"`);
if (!Number.isInteger(seed)) throw new Error(`--seed must be a whole number, not "${values.seed}"`);
const outPath = resolve(root, values.out);

// test mode keeps the reducer's debug logging quiet; no config file, so no app plugins
const server = await createServer({
  root,
  configFile: false,
  mode: 'test',
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const { simulateHistory, seededRandom } = await server.ssrLoadModule('/src/functions/simulate.ts');
  const { CHARACTERS } = await server.ssrLoadModule('/src/characters.ts');
  const { summarizeStats } = await server.ssrLoadModule('/src/functions/profiles.ts');

  const started = performance.now();
  const result = simulateHistory({
    rounds,
    rng: seededRandom(seed),
    // a running count in a terminal; nothing when the output is captured
    onProgress: process.stdout.isTTY
      ? (played) => process.stdout.write(`\r${played.toLocaleString()} of ${rounds.toLocaleString()} rounds`)
      : undefined,
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');

  const history = {
    description: 'Simulated play history for the characters, added to their records in the app. Regenerate with `npm run simulate-history`.',
    seed,
    rounds: result.rounds,
    sessions: result.sessions,
    stats: result.stats,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(history, null, 2) + '\n');

  console.log(`Played ${result.rounds.toLocaleString()} rounds over ${result.sessions.toLocaleString()} sittings in ${seconds}s (seed ${seed}).`);
  console.table(Object.fromEntries(CHARACTERS.map((character) => {
    const summary = summarizeStats(result.stats[character.id]);
    return [`${character.name} (${character.nickname})`, {
      rounds: summary.rounds,
      won: summary.won,
      lost: summary.lost,
      pushed: summary.pushed,
      'win rate': summary.winRate === undefined ? '—' : `${(summary.winRate * 100).toFixed(1)}%`,
      blackjacks: summary.blackjacks,
      busts: summary.busts,
      net: result.net[character.id],
    }];
  })));
  console.log(`Saved to ${outPath}`);
} finally {
  await server.close();
}
