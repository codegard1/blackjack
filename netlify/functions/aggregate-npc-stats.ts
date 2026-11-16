import type { Config } from '@netlify/functions';
import { aggregateNpcStats } from '../lib/aggregate';
import { getDb } from '../lib/mongo';

/**
 * Once a month, add up what every owner has played with the computer characters and
 * the dealer (see netlify/lib/aggregate.ts). Netlify runs this on the published
 * deploy only; it has no URL. To run it by hand, use Run now on the function's page
 * in the Netlify UI, or `npm run aggregate-stats` from a machine with the .env file.
 */
export default async (): Promise<void> => {
  try {
    const result = await aggregateNpcStats(getDb());
    console.log(
      `aggregate-npc-stats: read ${result.owners.seen} owners, ${result.owners.changed} added play, ${result.owners.refused} had stats refused`,
    );
  } catch (error) {
    console.error('aggregate-npc-stats: run failed', error);
    throw error;
  }
};

export const config: Config = {
  schedule: '@monthly',
};
