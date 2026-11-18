// Adds up what every owner has played with the computer characters and the dealer,
// and saves the sums in MongoDB for all clients to read. The same work runs once a
// month as the aggregate-npc-stats Netlify function; this runs it by hand.
//
//   npm run aggregate-stats -- --dry-run     show what a run would add; write nothing
//   npm run aggregate-stats                  add it up and save
//
// Reads MONGODB_URI and MONGODB_DB from the environment, or from .env when present.
// The code is TypeScript, so it is loaded through Vite like simulate-history.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  console.log('Usage: npm run aggregate-stats -- [--dry-run]');
  process.exit(0);
}

const envFile = join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const server = await createServer({
  root,
  configFile: false,
  mode: 'test',
  logLevel: 'error',
  appType: 'custom',
  // only the server code is loaded, so skip the scan of the app's browser dependencies
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, hmr: false, ws: false },
});

let client;
try {
  const { getClient, getDb } = await server.ssrLoadModule('/netlify/lib/mongo.ts');
  const { aggregateNpcStats, NPC_IDS } = await server.ssrLoadModule('/netlify/lib/aggregate.ts');

  const db = getDb();
  client = getClient();
  const result = await aggregateNpcStats(db, { dryRun: values['dry-run'] });

  console.log(`Read ${result.owners.seen} owners: ${result.owners.changed} added play, ${result.owners.refused} had stats refused.`);
  console.table(Object.fromEntries(NPC_IDS.map((id) => [id, {
    'hands added': result.added[id].numberOfGamesPlayed,
    hands: result.stats[id].numberOfGamesPlayed,
    won: result.stats[id].numberOfGamesWon,
    lost: result.stats[id].numberOfGamesLost,
    blackjacks: result.stats[id].numberOfTimesBlackjack,
    busts: result.stats[id].numberOfTimesBusted,
    net: result.stats[id].netResult,
  }])));
  console.log(result.dryRun ? 'Dry run: nothing was written.' : 'Saved.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client?.close();
  await server.close();
}
