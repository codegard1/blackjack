/**
 * The stats that add up across tables. winLossRatio is left out: it is worked out
 * again from the summed wins and losses.
 */
export const TALLY_KEYS = [
  'numberOfGamesLost',
  'numberOfGamesPlayed',
  'numberOfGamesWon',
  'numberOfTimesBlackjack',
  'numberOfTimesBusted',
  'totalWinnings',
  'netResult',
] as const;

export type TallyKey = typeof TALLY_KEYS[number];

/** One character's summed stats */
export type Tally = Record<TallyKey, number>;

export function emptyTally(): Tally {
  return {
    numberOfGamesLost: 0,
    numberOfGamesPlayed: 0,
    numberOfGamesWon: 0,
    numberOfTimesBlackjack: 0,
    numberOfTimesBusted: 0,
    totalWinnings: 0,
    netResult: 0,
  };
}

/**
 * What every table has played with the computer characters and the dealer, as the
 * server last added it up (see netlify/lib/aggregate.ts), keyed by character id.
 */
export type CommunityStats = {
  /** when the server added the tables up; 0 when this browser has never been told */
  generatedAt: number;
  /** every table's play, this browser's included */
  stats: Record<string, Tally>;
  /** this browser's own stats as they stood when they were added in */
  counted: Record<string, Tally>;
};
