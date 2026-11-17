// @vitest-environment node
import type { Db } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../src/characters';
import { emptyTally, type Tally } from '../../src/types/CommunityStats';
import { advance, aggregateNpcStats, isPlausible, MAX_HANDS_PER_RUN, NPC_IDS, readNpcStats, SNAPSHOT_ID, toTally } from './aggregate';
import { NPC_LEDGER_COLLECTION, NPC_STATS_COLLECTION, PROFILES_COLLECTION } from './mongo';

type Doc = { _id: string } & Record<string, unknown>;

/** Enough of a database for the aggregation: collections of documents keyed by _id */
function fakeDb(seed: Record<string, Doc[]> = {}) {
  const store = new Map<string, Map<string, Doc>>();
  const docs = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };
  for (const [name, list] of Object.entries(seed)) list.forEach((doc) => docs(name).set(doc._id, doc));
  let writes = 0;

  const collection = (name: string) => ({
    find: (filter: { _id?: { $in: string[] } } = {}) => {
      const ids = filter._id?.$in;
      const found = [...docs(name).values()].filter((doc) => !ids || ids.includes(doc._id)).map((doc) => structuredClone(doc));
      return {
        toArray: () => Promise.resolve(found),
        [Symbol.asyncIterator]: () => {
          const each = found[Symbol.iterator]();
          return { next: () => Promise.resolve(each.next()) };
        },
      };
    },
    findOne: ({ _id }: { _id: string }) => Promise.resolve(structuredClone(docs(name).get(_id) ?? null)),
    replaceOne: ({ _id }: { _id: string }, replacement: Record<string, unknown>) => {
      writes += 1;
      docs(name).set(_id, { ...replacement, _id });
      return Promise.resolve();
    },
    bulkWrite: (operations: { replaceOne: { filter: { _id: string }; replacement: Record<string, unknown> } }[]) => {
      for (const { replaceOne } of operations) {
        writes += 1;
        docs(name).set(replaceOne.filter._id, { ...replaceOne.replacement, _id: replaceOne.filter._id });
      }
      return Promise.resolve();
    },
  });

  return {
    db: { collection } as unknown as Db,
    get: (name: string, id: string) => docs(name).get(id),
    set: (name: string, doc: Doc) => docs(name).set(doc._id, doc),
    remove: (name: string, id: string) => docs(name).delete(id),
    writes: () => writes,
  };
}

const tally = (hands: number, won = 0, lost = 0, net = 0): Tally => ({
  ...emptyTally(), numberOfGamesPlayed: hands, numberOfGamesWon: won, numberOfGamesLost: lost, netResult: net, totalWinnings: Math.max(0, net),
});

const owner = (id: string, npcs: Record<string, unknown>): Doc => ({
  _id: id,
  profiles: {
    profiles: [
      { id: 'chris', name: 'Chris', createdAt: 0, stats: tally(999, 999) },
      ...Object.entries(npcs).map(([npcId, stats]) => ({ id: npcId, name: npcId, createdAt: 0, stats })),
    ],
    selectedId: 'chris',
    opponentIds: [],
  },
});

describe('the character ids', () => {
  it('match the characters in the app', () => {
    expect([...NPC_IDS].sort()).toEqual(CHARACTERS.map((character) => character.id).sort());
  });
});

describe('toTally and isPlausible', () => {
  it('reads stored stats, treating missing keys as zero and ignoring winLossRatio', () => {
    expect(toTally({ numberOfGamesPlayed: 3, numberOfGamesWon: 1, netResult: -20, winLossRatio: 0.5 })).toEqual(tally(3, 1, 0, -20));
  });

  it('refuses stats that could not come from real play', () => {
    expect(toTally(undefined)).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: 'many' })).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: -1 })).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: 1.5 })).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: 2, numberOfGamesWon: 2, numberOfGamesLost: 1 })).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: 2, numberOfTimesBlackjack: 3 })).toBeUndefined();
    expect(toTally({ numberOfGamesPlayed: 2, netResult: -1e9 })).toBeUndefined();
    expect(isPlausible(tally(0))).toBe(true);
  });
});

describe('advance', () => {
  it('adds only the growth since the owner was last counted', () => {
    const first = advance(undefined, tally(10, 4, 5, -30))!;
    expect(first.added).toEqual(tally(10, 4, 5, -30));
    const second = advance(first.next, tally(15, 7, 6, 10))!;
    expect(second.added).toMatchObject({ numberOfGamesPlayed: 5, numberOfGamesWon: 3, numberOfGamesLost: 1, netResult: 40 });
    expect(second.next.contribution).toMatchObject({ numberOfGamesPlayed: 15, numberOfGamesWon: 7, netResult: 10 });
    expect(second.next.last).toEqual(tally(15, 7, 6, 10));
  });

  it('counts everything again after the owner starts over, keeping what was added before', () => {
    const before = advance(undefined, tally(10, 4, 5))!;
    const after = advance(before.next, tally(3, 1, 1))!;
    expect(after.added).toEqual(tally(3, 1, 1));
    expect(after.next.contribution).toMatchObject({ numberOfGamesPlayed: 13, numberOfGamesWon: 5 });
  });

  it('refuses growth that could not come from real play', () => {
    const before = advance(undefined, tally(10, 4, 5))!;
    expect(advance(before.next, tally(10, 9, 1))).toBeUndefined();
    expect(advance(before.next, tally(12, 3, 5))).toBeUndefined();
    expect(advance(undefined, tally(MAX_HANDS_PER_RUN + 1))).toBeUndefined();
  });
});

describe('aggregateNpcStats', () => {
  it('sums the characters across owners, leaves humans out, and saves the snapshot', async () => {
    const fake = fakeDb({
      [PROFILES_COLLECTION]: [
        owner('browser:a', { ogion: tally(10, 4, 5, -30), dealer: tally(20, 11, 8, 70) }),
        owner('browser:b', { ogion: tally(6, 3, 3, 15) }),
      ],
    });
    const result = await aggregateNpcStats(fake.db, { now: 5 });
    expect(result.owners).toEqual({ seen: 2, changed: 2, refused: 0 });
    expect(result.stats.ogion).toMatchObject({ numberOfGamesPlayed: 16, numberOfGamesWon: 7, netResult: -15 });
    expect(result.stats.dealer.numberOfGamesPlayed).toBe(20);
    expect(result.stats.shevek).toEqual(emptyTally());
    expect(Object.keys(result.stats).sort()).toEqual([...NPC_IDS].sort());
    expect(fake.get(NPC_STATS_COLLECTION, SNAPSHOT_ID)).toMatchObject({ stats: result.stats, generatedAt: 5, owners: 2 });
  });

  it('adds nothing when run again, and only the growth after more play', async () => {
    const fake = fakeDb({ [PROFILES_COLLECTION]: [owner('browser:a', { ogion: tally(10, 4, 5) })] });
    await aggregateNpcStats(fake.db);
    const again = await aggregateNpcStats(fake.db);
    expect(again.owners.changed).toBe(0);
    expect(again.added.ogion).toEqual(emptyTally());
    expect(again.stats.ogion.numberOfGamesPlayed).toBe(10);

    fake.set(PROFILES_COLLECTION, owner('browser:a', { ogion: tally(14, 6, 6) }));
    const later = await aggregateNpcStats(fake.db);
    expect(later.added.ogion.numberOfGamesPlayed).toBe(4);
    expect(later.stats.ogion).toMatchObject({ numberOfGamesPlayed: 14, numberOfGamesWon: 6 });
  });

  it('keeps counting an owner whose profiles have expired', async () => {
    const fake = fakeDb({
      [PROFILES_COLLECTION]: [owner('browser:a', { ogion: tally(10, 4, 5) }), owner('browser:b', { ogion: tally(6, 3, 3) })],
    });
    await aggregateNpcStats(fake.db);
    fake.remove(PROFILES_COLLECTION, 'browser:a');
    const result = await aggregateNpcStats(fake.db);
    expect(result.owners.seen).toBe(1);
    expect(result.stats.ogion.numberOfGamesPlayed).toBe(16);
  });

  it('leaves out stats that could not come from real play, and counts the rest of that owner', async () => {
    const fake = fakeDb({
      [PROFILES_COLLECTION]: [
        owner('browser:a', { ogion: tally(10, 4, 5) }),
        owner('browser:cheat', { ogion: { numberOfGamesPlayed: 5, numberOfGamesWon: 9000 }, shevek: tally(2, 1, 1) }),
        { _id: 'browser:broken', profiles: 'nonsense' },
      ],
    });
    const result = await aggregateNpcStats(fake.db);
    expect(result.owners).toEqual({ seen: 3, changed: 2, refused: 1 });
    expect(result.stats.ogion.numberOfGamesPlayed).toBe(10);
    expect(result.stats.shevek.numberOfGamesPlayed).toBe(2);
  });

  it('writes nothing in a dry run, and reports what a run would produce', async () => {
    const fake = fakeDb({ [PROFILES_COLLECTION]: [owner('browser:a', { ogion: tally(10, 4, 5) })] });
    await aggregateNpcStats(fake.db);
    fake.set(PROFILES_COLLECTION, owner('browser:a', { ogion: tally(14, 6, 6) }));
    const written = fake.writes();
    const result = await aggregateNpcStats(fake.db, { dryRun: true });
    expect(fake.writes()).toBe(written);
    expect(result.dryRun).toBe(true);
    expect(result.added.ogion.numberOfGamesPlayed).toBe(4);
    expect(result.stats.ogion.numberOfGamesPlayed).toBe(14);
    expect((fake.get(NPC_LEDGER_COLLECTION, 'browser:a') as unknown as { npcs: { ogion: { last: Tally } } }).npcs.ogion.last.numberOfGamesPlayed).toBe(10);
  });

  it('handles more owners than fit in one batch', async () => {
    const owners = Array.from({ length: 1201 }, (_, index) => owner(`browser:${index}`, { dealer: tally(1, 1) }));
    const result = await aggregateNpcStats(fakeDb({ [PROFILES_COLLECTION]: owners }).db);
    expect(result.stats.dealer.numberOfGamesPlayed).toBe(1201);
  });
});

describe('readNpcStats', () => {
  it('is undefined before the first run', async () => {
    expect(await readNpcStats(fakeDb().db, 'browser:a')).toBeUndefined();
  });

  it('returns the sums with what the asking owner had played when they were made', async () => {
    const fake = fakeDb({
      [PROFILES_COLLECTION]: [owner('browser:a', { ogion: tally(10, 4, 5) }), owner('browser:b', { ogion: tally(6, 3, 3) })],
    });
    await aggregateNpcStats(fake.db, { now: 9 });
    const forA = (await readNpcStats(fake.db, 'browser:a'))!;
    expect(forA.generatedAt).toBe(9);
    expect(forA.stats.ogion.numberOfGamesPlayed).toBe(16);
    expect(forA.counted).toEqual({ ogion: tally(10, 4, 5) });
    expect((await readNpcStats(fake.db, 'browser:new'))!.counted).toEqual({});
  });
});
