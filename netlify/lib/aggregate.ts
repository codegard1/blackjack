import type { AnyBulkWriteOperation, Db } from 'mongodb';
import { emptyTally, TALLY_KEYS, type CommunityStats, type Tally } from '../../src/types/CommunityStats';
import { NPC_LEDGER_COLLECTION, NPC_STATS_COLLECTION, PROFILES_COLLECTION } from './mongo';

/**
 * The computer characters and the dealer, by profile id. Kept here rather than read
 * from src/characters.ts, which imports the portraits; a test holds the two in step.
 */
export const NPC_IDS = ['ogion', 'shevek', 'haber', 'genly-ai', 'dealer'] as const;

/** The one document in the stats collection */
export const SNAPSHOT_ID = 'current';

/**
 * The most hands one owner can add for one character in one run. A hand takes a few
 * seconds, so this is far beyond a month at one table; anything more is not counted.
 */
export const MAX_HANDS_PER_RUN = 50_000;

/** The most a character's bank can plausibly move in one hand, averaged over the hands added */
export const MAX_NET_PER_HAND = 10_000;

const BATCH_SIZE = 500;

/** The keys that only ever grow; netResult is the one that can fall */
const COUNT_KEYS = TALLY_KEYS.filter((key) => key !== 'netResult');

/** What one owner has added for one character */
export type LedgerEntry = {
  /** the owner's stats when they were last added in */
  last: Tally;
  /** everything this owner has added, across resets of their own stats */
  contribution: Tally;
};

/**
 * One owner's line in the ledger. It outlives the owner's profiles document, which
 * expires when it is not written for 90 days, so the sums never shrink.
 */
export type LedgerDocument = { _id: string; npcs: Record<string, LedgerEntry>; updatedAt: number };

export type SnapshotDocument = { _id: string; stats: Record<string, Tally>; generatedAt: number; owners: number };

type ProfilesDocument = { _id: string; profiles?: { profiles?: unknown } };

export type AggregateResult = {
  /** every owner's play, summed by character id */
  stats: Record<string, Tally>;
  /** what this run added to the sums */
  added: Record<string, Tally>;
  /** owners read, owners whose play changed the sums, and owners with stats that were refused */
  owners: { seen: number; changed: number; refused: number };
  generatedAt: number;
  dryRun: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const emptyTallies = (): Record<string, Tally> => Object.fromEntries(NPC_IDS.map((id) => [id, emptyTally()]));

function addInto(target: Tally, amount: Tally): void {
  for (const key of TALLY_KEYS) target[key] += amount[key] ?? 0;
}

/**
 * Whether a tally could come from real play: whole numbers, counts that are not
 * negative, no more wins, losses, blackjacks or busts than hands, and money within
 * what that many hands can move.
 */
export function isPlausible(tally: Tally): boolean {
  const hands = tally.numberOfGamesPlayed;
  return TALLY_KEYS.every((key) => Number.isSafeInteger(tally[key]))
    && COUNT_KEYS.every((key) => tally[key] >= 0)
    && tally.numberOfGamesWon + tally.numberOfGamesLost <= hands
    && tally.numberOfTimesBlackjack <= hands
    && tally.numberOfTimesBusted <= hands
    && tally.totalWinnings <= hands * MAX_NET_PER_HAND
    && Math.abs(tally.netResult) <= hands * MAX_NET_PER_HAND;
}

/** Read stored stats as a tally, or undefined when they could not come from real play */
export function toTally(value: unknown): Tally | undefined {
  if (!isRecord(value)) return undefined;
  const tally = emptyTally();
  for (const key of TALLY_KEYS) {
    const stat = value[key] ?? 0;
    if (typeof stat !== 'number') return undefined;
    tally[key] = stat;
  }
  return isPlausible(tally) ? tally : undefined;
}

/**
 * Work out what an owner's current stats add for one character since they were last
 * counted. Fewer hands than last time means the owner started over (Clear application
 * data), so everything they have now is new. Returns undefined when the growth could
 * not come from real play, and the ledger entry is then left as it was.
 */
export function advance(entry: LedgerEntry | undefined, current: Tally): { next: LedgerEntry; added: Tally } | undefined {
  const last = entry?.last ?? emptyTally();
  const startedOver = current.numberOfGamesPlayed < last.numberOfGamesPlayed;
  const added = emptyTally();
  for (const key of TALLY_KEYS) added[key] = startedOver ? current[key] : current[key] - last[key];
  if (!isPlausible(added) || added.numberOfGamesPlayed > MAX_HANDS_PER_RUN) return undefined;

  const contribution = { ...(entry?.contribution ?? emptyTally()) };
  addInto(contribution, added);
  return { next: { last: { ...current }, contribution }, added };
}

/** The characters' stats in one owner's profiles document, by character id */
function npcStatsIn(document: ProfilesDocument): Map<string, unknown> {
  const found = new Map<string, unknown>();
  const profiles = document.profiles?.profiles;
  if (!Array.isArray(profiles)) return found;
  for (const profile of profiles) {
    if (isRecord(profile) && typeof profile.id === 'string' && (NPC_IDS as readonly string[]).includes(profile.id)) {
      found.set(profile.id, profile.stats);
    }
  }
  return found;
}

/** Sum every owner's contribution in the ledger */
async function sumLedger(db: Db): Promise<{ stats: Record<string, Tally>; owners: number }> {
  const stats = emptyTallies();
  let owners = 0;
  const entries = db.collection<LedgerDocument>(NPC_LEDGER_COLLECTION).find({}, { projection: { npcs: 1 } });
  for await (const entry of entries) {
    owners += 1;
    for (const id of NPC_IDS) {
      const contribution = entry.npcs?.[id]?.contribution;
      if (contribution) addInto(stats[id], contribution);
    }
  }
  return { stats, owners };
}

/**
 * Add up what every owner has played with the computer characters and the dealer,
 * and save the sums for all clients to read.
 *
 * Each owner's profiles document holds lifetime stats from that owner's table alone.
 * This reads them all, adds each owner's growth since the last run to that owner's
 * ledger line, then sums the ledger into the snapshot document. Because only growth
 * is added, running it twice adds nothing the second time, and because the sums come
 * from the ledger, an owner whose profiles have expired still counts.
 *
 * With `dryRun` nothing is written and the result shows what a run would produce.
 */
export async function aggregateNpcStats(db: Db, options: { dryRun?: boolean; now?: number } = {}): Promise<AggregateResult> {
  const { dryRun = false, now = Date.now() } = options;
  const ledger = db.collection<LedgerDocument>(NPC_LEDGER_COLLECTION);
  const added = emptyTallies();
  const owners = { seen: 0, changed: 0, refused: 0 };

  const flush = async (batch: ProfilesDocument[]): Promise<void> => {
    if (batch.length === 0) return;
    const lines = await ledger.find({ _id: { $in: batch.map((document) => document._id) } }).toArray();
    const lineFor = new Map(lines.map((line) => [line._id, line]));
    const writes: AnyBulkWriteOperation<LedgerDocument>[] = [];

    for (const document of batch) {
      owners.seen += 1;
      const npcs = { ...(lineFor.get(document._id)?.npcs ?? {}) };
      let changed = false;
      let refused = false;
      for (const [id, stats] of npcStatsIn(document)) {
        const current = toTally(stats);
        const step = current && advance(npcs[id], current);
        if (!step) {
          refused = true;
          continue;
        }
        if (TALLY_KEYS.every((key) => step.added[key] === 0)) continue;
        npcs[id] = step.next;
        addInto(added[id], step.added);
        changed = true;
      }
      if (refused) owners.refused += 1;
      if (!changed) continue;
      owners.changed += 1;
      writes.push({ replaceOne: { filter: { _id: document._id }, replacement: { npcs, updatedAt: now }, upsert: true } });
    }
    if (!dryRun && writes.length > 0) await ledger.bulkWrite(writes, { ordered: false });
  };

  let batch: ProfilesDocument[] = [];
  const documents = db.collection<ProfilesDocument>(PROFILES_COLLECTION).find({}, { projection: { 'profiles.profiles': 1 } });
  for await (const document of documents) {
    batch.push(document);
    if (batch.length >= BATCH_SIZE) {
      await flush(batch);
      batch = [];
    }
  }
  await flush(batch);

  // After the writes the ledger holds this run's growth; in a dry run it is added on top
  const summed = await sumLedger(db);
  if (dryRun) {
    for (const id of NPC_IDS) addInto(summed.stats[id], added[id]);
  } else {
    await db.collection<SnapshotDocument>(NPC_STATS_COLLECTION).replaceOne(
      { _id: SNAPSHOT_ID },
      { stats: summed.stats, generatedAt: now, owners: summed.owners },
      { upsert: true },
    );
  }

  return { stats: summed.stats, added, owners, generatedAt: now, dryRun };
}

/**
 * The saved sums, with what this owner had played when they were added in, so the
 * owner's client can show its newer hands on top without counting the older ones twice.
 * Undefined until the first run.
 */
export async function readNpcStats(db: Db, ownerId: string): Promise<CommunityStats | undefined> {
  const snapshot = await db.collection<SnapshotDocument>(NPC_STATS_COLLECTION).findOne({ _id: SNAPSHOT_ID });
  if (!snapshot) return undefined;
  const line = await db.collection<LedgerDocument>(NPC_LEDGER_COLLECTION).findOne({ _id: ownerId });
  const counted: Record<string, Tally> = {};
  for (const id of NPC_IDS) {
    const last = line?.npcs?.[id]?.last;
    if (last) counted[id] = last;
  }
  return { generatedAt: snapshot.generatedAt, stats: snapshot.stats, counted };
}
