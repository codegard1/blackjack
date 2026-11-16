import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreName } from '../enums';
import { CommunityStats, emptyTally, PlayerStats, Tally } from '../types';
import { characterRecord, emptyCommunity, getCommunity, refreshCommunity, resetCommunity, roundsElsewhere, toCommunity, withCommunity } from './community';
import { historyRounds } from './history';
import { emptyStats } from './profiles';

const OWNER = 'browser:3b2e6c1e-4f55-4a9e-9c1a-1d2e3f4a5b6c.c2lnbmF0dXJlLXNpZ25hdHVyZS1zaWc';

const tally = (hands: number, won = 0, lost = 0, net = 0): Tally => ({
  ...emptyTally(), numberOfGamesPlayed: hands, numberOfGamesWon: won, numberOfGamesLost: lost, netResult: net,
});
const stats = (hands: number, won = 0, lost = 0, net = 0): PlayerStats => ({ ...emptyStats(), ...tally(hands, won, lost, net) });

const community: CommunityStats = {
  generatedAt: 7,
  stats: { ogion: tally(100, 40, 50, -300) },
  counted: { ogion: tally(10, 4, 5, -30) },
};

beforeEach(() => {
  localStorage.clear();
  resetCommunity();
  localStorage.setItem(StoreName.SYNCSTORE, JSON.stringify({ ownerId: OWNER, syncedAt: { profiles: 0, game: 0 } }));
});

afterEach(() => vi.unstubAllGlobals());

describe('withCommunity', () => {
  it('adds only the hands played here since this table was counted', () => {
    expect(withCommunity('ogion', stats(13, 6, 6, -10), community)).toMatchObject({
      numberOfGamesPlayed: 103, numberOfGamesWon: 42, numberOfGamesLost: 51, netResult: -280, winLossRatio: 42 / 51,
    });
    // nothing new here: the sums already hold this table
    expect(withCommunity('ogion', stats(10, 4, 5, -30), community).numberOfGamesPlayed).toBe(100);
  });

  it('counts everything here after this table started over', () => {
    expect(withCommunity('ogion', stats(2, 1, 1, 5), community)).toMatchObject({ numberOfGamesPlayed: 102, numberOfGamesWon: 41, netResult: -295 });
  });

  it('leaves alone anyone the server holds no sum for', () => {
    const here = stats(5, 2, 2);
    expect(withCommunity('chris', here, community)).toBe(here);
    expect(withCommunity('ogion', here, emptyCommunity())).toBe(here);
  });

  it('feeds the full record and the count of hands played elsewhere', () => {
    const here = stats(13, 6, 6);
    expect(characterRecord('ogion', here, community).numberOfGamesPlayed).toBe(103 + historyRounds('ogion'));
    expect(roundsElsewhere('ogion', here, community)).toBe(90 + historyRounds('ogion'));
    expect(roundsElsewhere('ogion', here, emptyCommunity())).toBe(historyRounds('ogion'));
  });
});

describe('toCommunity', () => {
  it('accepts what the server sends and refuses anything else', () => {
    expect(toCommunity(community)).toEqual(community);
    expect(toCommunity({ generatedAt: 1, stats: { ogion: { numberOfGamesPlayed: 2 } }, counted: {} })?.stats.ogion).toEqual(tally(2));
    expect(toCommunity(undefined)).toBeUndefined();
    expect(toCommunity({ generatedAt: 1, stats: { ogion: { numberOfGamesPlayed: 'many' } }, counted: {} })).toBeUndefined();
    expect(toCommunity({ generatedAt: 1, stats: {} })).toBeUndefined();
  });
});

describe('refreshCommunity', () => {
  it('adopts the server copy and keeps it for the next visit', async () => {
    const fetchMock = vi.fn(async () => Response.json(community));
    vi.stubGlobal('fetch', fetchMock);
    expect(getCommunity()).toEqual(emptyCommunity());
    await refreshCommunity();
    expect(fetchMock).toHaveBeenCalledWith(`/api/npc-stats/${encodeURIComponent(OWNER)}`, expect.anything());
    expect(getCommunity()).toEqual(community);
    resetCommunity();
    expect(getCommunity()).toEqual(community);
  });

  it('keeps the saved copy when the server has nothing, fails, or sends nonsense', async () => {
    localStorage.setItem(StoreName.COMMUNITYSTORE, JSON.stringify(community));
    resetCommunity();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Not found.' }, { status: 404 })));
    await refreshCommunity();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await refreshCommunity();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ generatedAt: 'soon' })));
    await refreshCommunity();
    expect(getCommunity()).toEqual(community);
  });

  it('forgets an owner id the server refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Unknown owner id.' }, { status: 403 })));
    await refreshCommunity();
    expect(JSON.parse(localStorage.getItem(StoreName.SYNCSTORE)!).ownerId).toBeUndefined();
  });
});
